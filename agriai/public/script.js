/**
 * AgriAI frontend behaviour.
 * Sends the farmer's question to POST /api/chat and shows the reply in #messages.
 */
(function () {
  'use strict';

  const form = document.getElementById('chat-form');
  const input = document.getElementById('query');
  const sendButton = form.querySelector('.send');
  const messages = document.getElementById('messages');
  const conversationSection = document.getElementById('conversation');
  const chips = document.querySelectorAll('.chip');

  const NOTE = 'This is general guidance. For a serious problem, please consult a local agricultural expert.';
  const history = []; // [{ role: 'user' | 'assistant', content }]
  let started = false;
  let pending = false;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- helpers ---------- */

  function scrollTo(element, block) {
    element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: block });
  }

  function resizeInput() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 144) + 'px';
  }

  function setPending(value) {
    pending = value;
    sendButton.disabled = value;
    messages.setAttribute('aria-busy', String(value));
  }

  // Turns plain text into paragraphs; keeps single line breaks
  function appendText(container, text) {
    text
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .forEach((block) => {
        const p = document.createElement('p');
        block.split('\n').forEach((line, i) => {
          if (i > 0) p.appendChild(document.createElement('br'));
          p.appendChild(document.createTextNode(line));
        });
        container.appendChild(p);
      });
  }

  /* ---------- message builders ---------- */

  function addUserMessage(text) {
    const article = document.createElement('article');
    article.className = 'message message-user';
    appendText(article, text);
    messages.appendChild(article);
    return article;
  }

  function addTyping() {
    const article = document.createElement('article');
    article.className = 'message message-bot message-typing';
    article.setAttribute('aria-label', 'AgriAI is writing an answer');
    for (let i = 0; i < 3; i++) article.appendChild(document.createElement('span'));
    messages.appendChild(article);
    return article;
  }

  function addBotMessage(text, sources) {
    const article = document.createElement('article');
    article.className = 'message message-bot';
    appendText(article, text);

    const note = document.createElement('p');
    note.className = 'message-note';
    note.textContent = NOTE;
    article.appendChild(note);

    if (sources && sources.length) {
      const footer = document.createElement('footer');
      footer.className = 'message-sources';
      const label = document.createElement('span');
      label.textContent = 'Drawn from';
      footer.appendChild(label);
      sources.forEach((s) => {
        const tag = document.createElement('span');
        tag.className = 'source';
        tag.textContent = s;
        footer.appendChild(tag);
      });
      article.appendChild(footer);
    }

    messages.appendChild(article);
    return article;
  }

  function addError(text) {
    const article = document.createElement('article');
    article.className = 'message message-bot message-error';
    appendText(article, text);
    messages.appendChild(article);
    return article;
  }

  /* ---------- sending ---------- */

  async function sendQuestion(question) {
    if (pending) return;

    // First real question: replace the sample conversation and dock the input
    if (!started) {
      messages.innerHTML = '';
      form.classList.add('is-docked');
      document.body.classList.add('is-chatting');
      started = true;
    }

    addUserMessage(question);
    const typing = addTyping();
    setPending(true);
    scrollTo(typing, 'center');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, history: history.slice(-6) }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        /* non-JSON response */
      }

      typing.remove();

      if (!response.ok) {
        const reply = addError(data.error || 'Something went wrong. Please try again.');
        scrollTo(reply, 'center');
        return;
      }

      history.push({ role: 'user', content: question });
      history.push({ role: 'assistant', content: data.reply });

      const reply = addBotMessage(data.reply, data.sources);
      scrollTo(reply, 'start');
    } catch (err) {
      typing.remove();
      const reply = addError('Could not reach the server. Check your connection and try again.');
      scrollTo(reply, 'center');
    } finally {
      setPending(false);
      input.focus({ preventScroll: true });
    }
  }

  /* ---------- events ---------- */

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || pending) return;

    input.value = '';
    resizeInput();
    sendQuestion(question);
  });

  // Enter sends, Shift+Enter adds a new line
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  input.addEventListener('input', resizeInput);

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      if (pending) return;
      input.value = chip.dataset.question;
      form.requestSubmit();
    });
  });

  // Keep the first scroll target sensible if the page is opened with #conversation
  if (!started && window.location.hash === '#conversation') {
    scrollTo(conversationSection, 'start');
  }
})();
