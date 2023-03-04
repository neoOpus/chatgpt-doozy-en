// ==UserScript==
// @name         A Day With ChatGPT
// @namespace    https://github.com/mefengl
// @version      0.0.2
// @description  A wonderful day spent with ChatGPT
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @author       mefengl
// @match        https://book.douban.com/subject/*
// @match        https://chat.openai.com/chat
// @require      https://cdn.staticfile.org/jquery/3.6.1/jquery.min.js
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @license MIT
// ==/UserScript==

(function () {
  'use strict';

  const default_menu_all = {
  };
  const menu_all = GM_getValue("menu_all", default_menu_all);
  // 检查是否有新增菜单
  for (let name in default_menu_all) {
    console.log(name);
    if (!(name in menu_all)) {
      menu_all[name] = default_menu_all[name];
    }
  }
  // 菜单更新的逻辑
  // 只对使用 douban 的读书人开启
  $(() => location.href.includes("book.douban") && GM_setValue("douban-book", true) && console.log("开启 douban读书 菜单"));
  if (GM_getValue("douban-book") == true) {
    console.log("开启 douban读书 菜单");
    default_menu_all.douban_book = false;
  }
  const menu_id = GM_getValue("menu_id", {});
  function update_menu() {
    for (let name in menu_all) {
      const value = menu_all[name];
      // 卸载原来的
      if (menu_id[name]) {
        GM_unregisterMenuCommand(menu_id[name]);
      }
      switch (name) {
        case "douban_book":
          // 添加新的
          menu_id[name] = GM_registerMenuCommand(
            " douban读书：" + (value ? "✅" : "❌"),
            () => {
              menu_all[name] = !menu_all[name];
              GM_setValue("menu_all", menu_all);
              // 调用时触发，刷新菜单
              update_menu();
              // 该设置需刷新生效
              location.reload();
            }
          );
          break;
      }
    };
    GM_setValue("menu_id", menu_id);
  }
  update_menu();

  const prompts = [
    (title, author) => `${author}的《${title}》简要介绍会是：`,
    (title, author) => `《${title}》的作者${author}简要介绍会是：`,
    (title, author) => `${author}的《${title}》的主要观点列成表格会是：`,
    (title, author) => `${author}的《${title}》的类似书籍或文章和它们的区别会是：`,
    (title, author) => `${author}的《${title}》的观点相反的书籍或文章和对应的观点会是：`,
    (title, author) => `${author}的《${title}》的正面评论会是：`,
    (title, author) => `${author}的《${title}》的负面评论会是：`,
    (title, author) => `${author}的《${title}》综合Goodreads评分和豆瓣等各种评分和评价会是：`,
    (title, author) => `${author}的《${title}》比较重要的章节会是：`,
    (title, author) => `${author}的《${title}》可以和这些书籍或文章进行比较阅读：`,
    (title, author) => `${author}的《${title}》可以和这些书籍或文章进行主题阅读：`,
  ]
  // a cache for lastest 10 title-author
  menu_all.douban_book && $(() => {
    if (location.href.includes("book.douban.com/subject")) {
      const title = $("meta[property='og:title']").attr("content");
      const author = $("meta[property='book:author']").attr("content");
      const douban_book_cache = GM_getValue("douban_book_cache", []);
      // if not in cache, add it, or return
      if (!douban_book_cache.some(item => item.title == title && item.author == author)) {
        douban_book_cache.push({ title, author });
        if (douban_book_cache.length > 10) {
          douban_book_cache.shift();
        }
        GM_setValue("douban_book_cache", douban_book_cache);

        // trigger ChatGPT
        const prompt_texts = prompts.map(prompt => prompt(title, author));
        GM_setValue("prompt_texts", prompt_texts);
      } else { return; }
    }
  });

  // ChatGPT response to prompt_texts
  const get_submit_button = () => {
    const form = document.querySelector('form');
    const buttons = form.querySelectorAll('button');
    const result = buttons[buttons.length - 1]; // by textContent maybe better
    return result;
  };
  const get_textarea = () => {
    const form = document.querySelector('form');
    const textareas = form.querySelectorAll('textarea');
    const result = textareas[0];
    return result;
  };
  const get_regenerate_button = () => {
    const form = document.querySelector('form');
    const buttons = form.querySelectorAll('button');
    for (let i = 0; i < buttons.length; i++) {
      const buttonText = buttons[i].textContent.trim().toLowerCase();
      if (buttonText.includes('regenerate')) {
        return buttons[i];
      }
    }
  };

  let last_trigger_time = +new Date();
  $(() => {
    if (location.href.includes("chat.openai")) {
      console.log("ChatGPT");
      GM_addValueChangeListener("prompt_texts", (name, old_value, new_value) => {
        if (+new Date() - last_trigger_time < 500) {
          return;
        }
        last_trigger_time = new Date();
        setTimeout(async () => {
          console.log("ChatGPT页面响应prompt_texts");
          const prompt_texts = new_value;
          console.log(prompt_texts);
          if (prompt_texts.length > 0) {
            console.log("进入处理");
            // get prompt_texts from local
            let firstTime = true;
            while (prompt_texts.length > 0) {
              if (!firstTime) {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
              if (!firstTime && get_regenerate_button() == undefined) {
                continue;
              }
              firstTime = false;
              const prompt_text = prompt_texts.shift();
              console.log(prompt_text);
              // write the prompt_text
              get_textarea().value = prompt_text;
              // submit
              get_submit_button().click();
            }
          }
        }, 0);
        GM_setValue("prompt_texts", []);
      });
    }
  });
})();
