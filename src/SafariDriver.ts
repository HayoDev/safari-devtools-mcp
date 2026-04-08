/**
 * Safari WebDriver manager.
 * Handles browser automation via safaridriver + Selenium WebDriver.
 */

import {Builder, type ThenableWebDriver} from 'selenium-webdriver';
import safari from 'selenium-webdriver/safari.js';
import {CONSOLE_CAPTURE_SCRIPT} from './injected/console.js';
import {NETWORK_CAPTURE_SCRIPT} from './injected/network.js';
import {SNAPSHOT_SCRIPT} from './injected/snapshot.js';
import type {
  ConsoleLogEntry,
  NetworkLogEntry,
  PageInfo,
  SnapshotNode,
} from './types.js';

export class SafariDriver {
  private driver: ThenableWebDriver | null = null;
  private initialized = false;
  private injectedOnPages = new Set<string>();

  async ensureDriver(): Promise<ThenableWebDriver> {
    if (this.driver) {
      // Health check: verify the session is still alive
      try {
        await this.driver.getTitle();
      } catch {
        // Session is dead — clean up and recreate
        this.driver = null;
        this.initialized = false;
        this.injectedOnPages.clear();
      }
    }

    if (!this.driver) {
      const options = new safari.Options();
      this.driver = new Builder()
        .forBrowser('safari')
        .setSafariOptions(options)
        .build();
      this.initialized = true;
    }
    return this.driver;
  }

  async isReady(): Promise<boolean> {
    return this.initialized && this.driver !== null;
  }

  /**
   * Wait for the page to be ready: document.readyState === 'complete',
   * then wait for DOM to stabilize (no mutations for 100ms).
   */
  private async waitForPageReady(timeout = 10000): Promise<void> {
    const driver = await this.ensureDriver();

    // Phase 1: Wait for document.readyState === 'complete'
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const state = await driver.executeScript<string>(
        'return document.readyState;',
      );
      if (state === 'complete') break;
      await new Promise(r => setTimeout(r, 50));
    }

    // Phase 2: Wait for DOM stability (no mutations for 100ms)
    await driver
      .executeAsyncScript(
        `
      const done = arguments[arguments.length - 1];
      const timeout = ${Math.max(0, timeout - (Date.now() - start))};
      let timer = setTimeout(() => done(), 100);
      const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          observer.disconnect();
          done();
        }, 100);
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
      });
      setTimeout(() => {
        observer.disconnect();
        done();
      }, Math.min(timeout, 3000));
    `,
      )
      .catch(() => {
        // Ignore errors from page transitions
      });
  }

  /**
   * Inject console and network capture scripts into the current page.
   * Uses a page-URL-based guard so we re-inject after navigations.
   */
  async injectCaptureScripts(): Promise<void> {
    const driver = await this.ensureDriver();
    const currentUrl = await driver.getCurrentUrl();

    // Always check if scripts are still present (page may have navigated)
    const isInjected = await driver.executeScript<boolean>(
      'return !!window.__safariDevToolsConsoleInitialized;',
    );

    if (!isInjected) {
      await driver.executeScript(CONSOLE_CAPTURE_SCRIPT);
      await driver.executeScript(NETWORK_CAPTURE_SCRIPT);
      this.injectedOnPages.add(currentUrl);
    }
  }

  // ---- Navigation ----

  async navigate(url: string): Promise<void> {
    const driver = await this.ensureDriver();
    await driver.get(url);
    await this.waitForPageReady();
    await this.injectCaptureScripts();
  }

  async goBack(): Promise<void> {
    const driver = await this.ensureDriver();
    await driver.navigate().back();
    await this.waitForPageReady();
    await this.injectCaptureScripts();
  }

  async goForward(): Promise<void> {
    const driver = await this.ensureDriver();
    await driver.navigate().forward();
    await this.waitForPageReady();
    await this.injectCaptureScripts();
  }

  async reload(): Promise<void> {
    const driver = await this.ensureDriver();
    await driver.navigate().refresh();
    await this.waitForPageReady();
    await this.injectCaptureScripts();
  }

  async getCurrentUrl(): Promise<string> {
    const driver = await this.ensureDriver();
    return driver.getCurrentUrl();
  }

  async getTitle(): Promise<string> {
    const driver = await this.ensureDriver();
    return driver.getTitle();
  }

  // ---- Console ----

  async getConsoleLogs(options?: {
    types?: string[];
    pageSize?: number;
    pageIdx?: number;
  }): Promise<ConsoleLogEntry[]> {
    const driver = await this.ensureDriver();
    await this.injectCaptureScripts();

    let logs = await driver.executeScript<ConsoleLogEntry[]>(
      'return window.__safariDevToolsConsoleLogs || [];',
    );

    if (options?.types && options.types.length > 0) {
      logs = logs.filter(l => options.types!.includes(l.level));
    }

    if (options?.pageSize !== undefined) {
      const idx = options.pageIdx ?? 0;
      const start = idx * options.pageSize;
      logs = logs.slice(start, start + options.pageSize);
    }

    return logs;
  }

  async getConsoleMessage(msgid: number): Promise<ConsoleLogEntry | null> {
    const driver = await this.ensureDriver();
    await this.injectCaptureScripts();

    const log = await driver.executeScript<ConsoleLogEntry | null>(
      `return (window.__safariDevToolsConsoleLogs || []).find(l => l.msgid === ${msgid}) || null;`,
    );
    return log;
  }

  // ---- Network ----

  async getNetworkLogs(options?: {
    resourceTypes?: string[];
    pageSize?: number;
    pageIdx?: number;
  }): Promise<NetworkLogEntry[]> {
    const driver = await this.ensureDriver();
    await this.injectCaptureScripts();

    let logs = await driver.executeScript<NetworkLogEntry[]>(
      'return window.__safariDevToolsNetworkLogs || [];',
    );

    if (options?.resourceTypes && options.resourceTypes.length > 0) {
      logs = logs.filter(l => options.resourceTypes!.includes(l.resourceType));
    }

    if (options?.pageSize !== undefined) {
      const idx = options.pageIdx ?? 0;
      const start = idx * options.pageSize;
      logs = logs.slice(start, start + options.pageSize);
    }

    return logs;
  }

  async getNetworkRequest(reqid: number): Promise<NetworkLogEntry | null> {
    const driver = await this.ensureDriver();
    await this.injectCaptureScripts();

    const log = await driver.executeScript<NetworkLogEntry | null>(
      `return (window.__safariDevToolsNetworkLogs || []).find(l => l.reqid === ${reqid}) || null;`,
    );
    return log;
  }

  // ---- JavaScript Evaluation ----

  async evaluateScript(fn: string, args?: string[]): Promise<string> {
    const driver = await this.ensureDriver();
    await this.injectCaptureScripts();

    // If args are UIDs, resolve them to elements first
    if (args && args.length > 0) {
      const argsScript = args
        .map(uid => `document.querySelector('[data-safari-uid="${uid}"]')`)
        .join(', ');
      const result = await driver.executeScript<unknown>(
        `return JSON.stringify(await (${fn})(${argsScript}));`,
      );
      return String(result ?? 'undefined');
    }

    const result = await driver.executeScript<unknown>(
      `return JSON.stringify(await (${fn})());`,
    );
    return String(result ?? 'undefined');
  }

  // ---- Screenshot ----

  async takeScreenshot(): Promise<string> {
    const driver = await this.ensureDriver();
    return driver.takeScreenshot();
  }

  async takeElementScreenshot(uid: string): Promise<string> {
    const driver = await this.ensureDriver();
    const element = await driver.findElement({
      css: `[data-safari-uid="${uid}"]`,
    });
    return element.takeScreenshot();
  }

  // ---- DOM Snapshot ----

  async takeSnapshot(verbose?: boolean): Promise<SnapshotNode> {
    const driver = await this.ensureDriver();
    const result = await driver.executeScript<SnapshotNode>(
      SNAPSHOT_SCRIPT + `\nreturn __safariDevToolsTakeSnapshot(${!!verbose});`,
    );
    return result;
  }

  // ---- Element Interaction ----

  async clickElement(uid: string, dblClick?: boolean): Promise<void> {
    const driver = await this.ensureDriver();
    const element = await driver.findElement({
      css: `[data-safari-uid="${uid}"]`,
    });
    if (dblClick) {
      const actions = driver.actions({async: true});
      await actions.doubleClick(element).perform();
    } else {
      await element.click();
    }
    await this.injectCaptureScripts();
  }

  async clickAtCoordinates(
    x: number,
    y: number,
    dblClick?: boolean,
  ): Promise<void> {
    const driver = await this.ensureDriver();
    const actions = driver.actions({async: true});
    if (dblClick) {
      await actions
        .move({x: Math.round(x), y: Math.round(y)})
        .doubleClick()
        .perform();
    } else {
      await actions
        .move({x: Math.round(x), y: Math.round(y)})
        .click()
        .perform();
    }
  }

  async hoverElement(uid: string): Promise<void> {
    const driver = await this.ensureDriver();
    const element = await driver.findElement({
      css: `[data-safari-uid="${uid}"]`,
    });
    const actions = driver.actions({async: true});
    await actions.move({origin: element}).perform();
  }

  async fillElement(uid: string, value: string): Promise<void> {
    const driver = await this.ensureDriver();
    const element = await driver.findElement({
      css: `[data-safari-uid="${uid}"]`,
    });

    // Check if it's a select element
    const tagName = await element.getTagName();
    if (tagName.toLowerCase() === 'select') {
      // Find and click the option with matching text
      await driver.executeScript(
        `
        const select = document.querySelector('[data-safari-uid="${uid}"]');
        const options = select.options;
        for (let i = 0; i < options.length; i++) {
          if (options[i].text === arguments[0] || options[i].value === arguments[0]) {
            select.value = options[i].value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      `,
        value,
      );
    } else {
      await element.clear();
      await element.sendKeys(value);
    }
  }

  async typeText(text: string, submitKey?: string): Promise<void> {
    const driver = await this.ensureDriver();
    const actions = driver.actions({async: true});
    await actions.sendKeys(text).perform();
    if (submitKey) {
      await this.pressKey(submitKey);
    }
  }

  async pressKey(key: string): Promise<void> {
    const driver = await this.ensureDriver();
    // Parse key combinations like "Control+A", "Meta+Shift+R"
    const {Key} = await import('selenium-webdriver');
    const parts = key.split('+');
    const modifiers: string[] = [];
    const mainKey = parts[parts.length - 1];

    for (let i = 0; i < parts.length - 1; i++) {
      const mod = parts[i].toLowerCase();
      switch (mod) {
        case 'control':
        case 'ctrl':
          modifiers.push(Key.CONTROL);
          break;
        case 'shift':
          modifiers.push(Key.SHIFT);
          break;
        case 'alt':
        case 'option':
          modifiers.push(Key.ALT);
          break;
        case 'meta':
        case 'command':
        case 'cmd':
          modifiers.push(Key.META);
          break;
      }
    }

    // Map special key names to Key constants
    const keyMap: Record<string, string> = {
      enter: Key.ENTER,
      return: Key.RETURN,
      tab: Key.TAB,
      escape: Key.ESCAPE,
      esc: Key.ESCAPE,
      backspace: Key.BACK_SPACE,
      delete: Key.DELETE,
      arrowup: Key.ARROW_UP,
      arrowdown: Key.ARROW_DOWN,
      arrowleft: Key.ARROW_LEFT,
      arrowright: Key.ARROW_RIGHT,
      home: Key.HOME,
      end: Key.END,
      pageup: Key.PAGE_UP,
      pagedown: Key.PAGE_DOWN,
      space: Key.SPACE,
      f1: Key.F1,
      f2: Key.F2,
      f3: Key.F3,
      f4: Key.F4,
      f5: Key.F5,
      f6: Key.F6,
      f7: Key.F7,
      f8: Key.F8,
      f9: Key.F9,
      f10: Key.F10,
      f11: Key.F11,
      f12: Key.F12,
    };

    const resolvedKey = keyMap[mainKey.toLowerCase()] ?? mainKey;

    const actions = driver.actions({async: true});
    for (const mod of modifiers) {
      await actions.keyDown(mod).perform();
    }
    await actions.sendKeys(resolvedKey).perform();
    for (const mod of modifiers.reverse()) {
      await actions.keyUp(mod).perform();
    }
  }

  async dragElement(fromUid: string, toUid: string): Promise<void> {
    const driver = await this.ensureDriver();
    const from = await driver.findElement({
      css: `[data-safari-uid="${fromUid}"]`,
    });
    const to = await driver.findElement({
      css: `[data-safari-uid="${toUid}"]`,
    });
    const actions = driver.actions({async: true});
    await actions.dragAndDrop(from, to).perform();
  }

  async uploadFile(uid: string, filePath: string): Promise<void> {
    const driver = await this.ensureDriver();
    const element = await driver.findElement({
      css: `[data-safari-uid="${uid}"]`,
    });
    await element.sendKeys(filePath);
  }

  // ---- Right Click ----

  async rightClick(uid: string): Promise<void> {
    const driver = await this.ensureDriver();
    const element = await driver.findElement({
      css: `[data-safari-uid="${uid}"]`,
    });
    const actions = driver.actions({async: true});
    await actions.contextClick(element).perform();
  }

  // ---- Select Option ----

  async selectOption(
    uid: string,
    value?: string,
    label?: string,
  ): Promise<void> {
    const driver = await this.ensureDriver();
    await driver.executeScript(
      `
      var select = document.querySelector('[data-safari-uid="${uid}"]');
      if (!select || select.tagName !== 'SELECT') throw new Error('Element is not a <select>');
      var options = select.options;
      for (var i = 0; i < options.length; i++) {
        if ((arguments[0] && options[i].value === arguments[0]) ||
            (arguments[1] && options[i].text === arguments[1])) {
          select.selectedIndex = i;
          select.dispatchEvent(new Event('change', {bubbles: true}));
          return;
        }
      }
      throw new Error('Option not found');
      `,
      value ?? '',
      label ?? '',
    );
  }

  // ---- Clear Logs ----

  async clearConsoleLogs(): Promise<void> {
    const driver = await this.ensureDriver();
    await driver.executeScript(
      'window.__safariDevToolsConsoleLogs = [];' +
        ' window.__safariDevToolsConsoleMsgId = 0;',
    );
  }

  async clearNetworkLogs(): Promise<void> {
    const driver = await this.ensureDriver();
    await driver.executeScript(
      'window.__safariDevToolsNetworkLogs = [];' +
        ' window.__safariDevToolsNetworkReqId = 0;' +
        ' if (window.__safariDevToolsInterceptedUrls)' +
        ' window.__safariDevToolsInterceptedUrls.clear();',
    );
  }

  // ---- Page Content ----

  async getPageContent(): Promise<{
    title: string;
    url: string;
    text: string;
  }> {
    const driver = await this.ensureDriver();
    const title = await driver.getTitle();
    const url = await driver.getCurrentUrl();
    const text = await driver.executeScript<string>(
      'var t = (document.body || document.documentElement).innerText || "";' +
        ' return t.length > 10000 ? t.substring(0, 10000) + "... [truncated]" : t;',
    );
    return {title, url, text};
  }

  async getHtmlSource(): Promise<string> {
    const driver = await this.ensureDriver();
    return driver.executeScript<string>(
      'return document.documentElement.outerHTML;',
    );
  }

  async extractLinks(): Promise<{href: string; text: string; rel: string}[]> {
    const driver = await this.ensureDriver();
    return driver.executeScript(
      `var links = document.querySelectorAll('a[href]');
      var result = [];
      for (var i = 0; i < links.length; i++) {
        result.push({
          href: links[i].href,
          text: (links[i].textContent || '').trim().substring(0, 200),
          rel: links[i].getAttribute('rel') || ''
        });
      }
      return result;`,
    );
  }

  async extractMeta(): Promise<{name: string; content: string}[]> {
    const driver = await this.ensureDriver();
    return driver.executeScript(
      `var metas = document.querySelectorAll('meta[name], meta[property]');
      var result = [];
      for (var i = 0; i < metas.length; i++) {
        result.push({
          name: metas[i].getAttribute('name') || metas[i].getAttribute('property') || '',
          content: metas[i].getAttribute('content') || ''
        });
      }
      return result;`,
    );
  }

  // ---- Scroll ----

  async scroll(direction: string, amount: number): Promise<void> {
    const driver = await this.ensureDriver();
    const scrollMap: Record<string, [number, number]> = {
      up: [0, -amount],
      down: [0, amount],
      left: [-amount, 0],
      right: [amount, 0],
    };
    const [x, y] = scrollMap[direction] ?? [0, 0];
    await driver.executeScript(`window.scrollBy(${x}, ${y});`);
  }

  async scrollToElement(uid: string): Promise<void> {
    const driver = await this.ensureDriver();
    await driver.executeScript(
      `var el = document.querySelector('[data-safari-uid="${uid}"]');` +
        ` if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'});`,
    );
  }

  // ---- Page/Window Management ----

  async resizePage(width: number, height: number): Promise<void> {
    const driver = await this.ensureDriver();
    const window = driver.manage().window();
    await window.setRect({width, height});
  }

  // ---- Wait ----

  async waitForText(texts: string[], timeout?: number): Promise<string> {
    const driver = await this.ensureDriver();
    const timeoutMs = timeout ?? 30000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      for (const text of texts) {
        const found = await driver.executeScript<boolean>(
          `return document.body && document.body.innerText.includes(${JSON.stringify(text)});`,
        );
        if (found) {
          return text;
        }
      }
      await new Promise(r => setTimeout(r, 250));
    }

    throw new Error(
      `Timeout waiting for text: ${JSON.stringify(texts)} after ${timeoutMs}ms`,
    );
  }

  async waitForSelector(
    selector: string,
    options?: {visible?: boolean; timeout?: number},
  ): Promise<void> {
    const driver = await this.ensureDriver();
    const timeoutMs = options?.timeout ?? 30000;
    const checkVisible = options?.visible ?? false;
    const startTime = Date.now();

    const script = checkVisible
      ? `
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && style.opacity !== '0'
          && el.offsetWidth > 0
          && el.offsetHeight > 0;
      `
      : `return !!document.querySelector(${JSON.stringify(selector)});`;

    while (Date.now() - startTime < timeoutMs) {
      const found = await driver.executeScript<boolean>(
        checkVisible ? `return (function() { ${script} })();` : script,
      );
      if (found) return;
      await new Promise(r => setTimeout(r, 250));
    }

    const mode = checkVisible ? 'visible' : 'present';
    throw new Error(
      `Timeout waiting for selector "${selector}" to be ${mode} after ${timeoutMs}ms`,
    );
  }

  async waitForFunction(predicate: string, timeout?: number): Promise<void> {
    const driver = await this.ensureDriver();
    const timeoutMs = timeout ?? 30000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const result = await driver.executeScript<boolean>(
        `return !!(${predicate});`,
      );
      if (result) return;
      await new Promise(r => setTimeout(r, 250));
    }

    throw new Error(
      `Timeout waiting for predicate to be truthy after ${timeoutMs}ms`,
    );
  }

  // ---- Tab management via AppleScript ----

  async listPages(): Promise<PageInfo[]> {
    const {execSync} = await import('child_process');
    try {
      const script = `
        tell application "Safari"
          set tabList to {}
          set windowList to every window
          repeat with w in windowList
            set tabItems to every tab of w
            repeat with t in tabItems
              set tabURL to URL of t
              set tabName to name of t
              set end of tabList to tabURL & "|||" & tabName
            end repeat
          end repeat
          set AppleScript's text item delimiters to "\\n"
          return tabList as text
        end tell
      `;
      const result = execSync(
        `osascript -e '${script.replace(/'/g, "'\\''")}'`,
        {
          encoding: 'utf-8',
          timeout: 5000,
        },
      ).trim();

      if (!result) return [];

      const currentUrl = await this.getCurrentUrl();
      return result.split('\n').map((line, idx) => {
        const [url, title] = line.split('|||');
        return {
          pageId: idx,
          url: url || '',
          title: title || '',
          isSelected: url === currentUrl,
        };
      });
    } catch (e) {
      // Fallback: return current page with warning
      const url = await this.getCurrentUrl();
      const title = await this.getTitle();
      const warning = e instanceof Error ? e.message : String(e);
      return [
        {
          pageId: 0,
          url,
          title,
          isSelected: true,
          warning: `AppleScript tab listing failed (${warning}). Showing current page only. Ensure Safari is running and Accessibility permissions are granted.`,
        },
      ];
    }
  }

  async selectPage(pageId: number): Promise<void> {
    const {execSync} = await import('child_process');
    const tabIndex = pageId + 1; // AppleScript is 1-indexed
    try {
      const script = `
        tell application "Safari"
          set tabCount to 0
          set windowList to every window
          repeat with w in windowList
            set tabItems to every tab of w
            repeat with idx from 1 to count of tabItems
              if tabCount + idx is equal to ${tabIndex} then
                set current tab of w to item idx of tabItems
                set index of w to 1
                return
              end if
            end repeat
            set tabCount to tabCount + (count of tabItems)
          end repeat
        end tell
      `;
      execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch {
      throw new Error(`Failed to select page with ID ${pageId}`);
    }
  }

  async newPage(url: string): Promise<{warning?: string}> {
    const {execSync} = await import('child_process');
    try {
      const script = `
        tell application "Safari"
          tell window 1
            set newTab to make new tab with properties {URL:"${url}"}
            set current tab to newTab
          end tell
        end tell
      `;
      execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
      return {};
    } catch (e) {
      // Fallback to WebDriver navigation
      await this.navigate(url);
      const msg = e instanceof Error ? e.message : String(e);
      return {
        warning: `AppleScript new-tab failed (${msg}). Fell back to WebDriver navigation — page opened but not as a new tab. Ensure Accessibility permissions are granted.`,
      };
    }
  }

  async closePage(pageId: number): Promise<void> {
    const {execSync} = await import('child_process');
    const tabIndex = pageId + 1;
    try {
      const script = `
        tell application "Safari"
          set tabCount to 0
          set windowList to every window
          repeat with w in windowList
            set tabItems to every tab of w
            if (count of tabItems) is 1 and (count of windowList) is 1 then
              error "Cannot close the last open page."
            end if
            repeat with idx from 1 to count of tabItems
              if tabCount + idx is equal to ${tabIndex} then
                close item idx of tabItems
                return
              end if
            end repeat
            set tabCount to tabCount + (count of tabItems)
          end repeat
        end tell
      `;
      execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
    } catch (e) {
      throw new Error(
        e instanceof Error ? e.message : `Failed to close page ${pageId}`,
      );
    }
  }

  // ---- CSS ----

  async getComputedStyle(
    uid: string,
    properties: string[],
  ): Promise<Record<string, string> | null> {
    const driver = await this.ensureDriver();
    return driver.executeScript<Record<string, string> | null>(
      `
      const el = document.querySelector('[data-safari-uid="${uid}"]');
      if (!el) return null;
      const cs = window.getComputedStyle(el);
      const result = {};
      for (const prop of arguments[0]) {
        result[prop] = cs.getPropertyValue(prop);
      }
      return result;
      `,
      properties,
    );
  }

  // ---- Cookies ----

  async getCookies(): Promise<
    {
      name: string;
      value: string;
      domain?: string;
      path?: string;
      secure?: boolean;
      httpOnly?: boolean;
      expiry?: number;
    }[]
  > {
    const driver = await this.ensureDriver();
    const cookies = await driver.manage().getCookies();
    return cookies.map(c => ({
      ...c,
      expiry:
        c.expiry instanceof Date
          ? Math.floor(c.expiry.getTime() / 1000)
          : c.expiry,
    }));
  }

  async setCookie(cookie: {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    expiry?: number;
  }): Promise<void> {
    const driver = await this.ensureDriver();
    await driver.manage().addCookie(cookie);
  }

  async deleteCookie(name: string): Promise<void> {
    const driver = await this.ensureDriver();
    await driver.manage().deleteCookie(name);
  }

  async deleteAllCookies(): Promise<void> {
    const driver = await this.ensureDriver();
    await driver.manage().deleteAllCookies();
  }

  // ---- Storage ----

  async getStorage(
    type: string,
    key?: string,
  ): Promise<string | Record<string, string> | null> {
    const driver = await this.ensureDriver();
    if (key) {
      return driver.executeScript<string | null>(
        `return ${type}.getItem(${JSON.stringify(key)});`,
      );
    }
    return driver.executeScript<Record<string, string>>(
      `const entries = {}; for (let i = 0; i < ${type}.length; i++) { const k = ${type}.key(i); entries[k] = ${type}.getItem(k); } return entries;`,
    );
  }

  async setStorage(type: string, key: string, value: string): Promise<void> {
    const driver = await this.ensureDriver();
    await driver.executeScript(
      `${type}.setItem(${JSON.stringify(key)}, ${JSON.stringify(value)});`,
    );
  }

  async deleteStorage(type: string, key: string): Promise<void> {
    const driver = await this.ensureDriver();
    await driver.executeScript(`${type}.removeItem(${JSON.stringify(key)});`);
  }

  async clearStorage(type: string): Promise<void> {
    const driver = await this.ensureDriver();
    await driver.executeScript(`${type}.clear();`);
  }

  // ---- Cleanup ----

  async close(): Promise<void> {
    if (this.driver) {
      try {
        await this.driver.quit();
      } catch {
        // Ignore close errors
      }
      this.driver = null;
      this.initialized = false;
      this.injectedOnPages.clear();
    }
  }
}
