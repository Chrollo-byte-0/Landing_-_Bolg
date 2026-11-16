(function () {
  "use strict";

  var script = document.currentScript;
  var siteId = script && script.dataset.siteId;
  var builderUrl = script && script.dataset.builderUrl;
  var status = document.getElementById("cms-content-status");
  if (!siteId || !builderUrl || !status) return;

  function setText(selector, value) {
    var element = document.querySelector(selector);
    if (element && typeof value === "string") element.textContent = value;
  }

  function setLink(anchor, label, href, httpsOnly) {
    if (!anchor) return;
    if (typeof label === "string") anchor.textContent = label;
    if (typeof href !== "string" || !href.trim()) {
      anchor.hidden = true;
      return;
    }
    var safe = httpsOnly
      ? /^https:\/\/\S+$/i.test(href)
      : /^#[A-Za-z0-9_-]+$/.test(href) || /^https?:\/\/\S+$/i.test(href);
    if (!safe) {
      status.textContent = "Se ignoró un enlace no válido del contenido publicado.";
      return;
    }
    anchor.hidden = false;
    anchor.href = href;
  }

  function replaceTextItems(container, selector, items, kind) {
    if (!container || !Array.isArray(items)) return;
    var existing = Array.from(container.querySelectorAll(selector));
    var template = existing[0] && existing[0].cloneNode(true);
    items.forEach(function (item, index) {
      var element = existing[index] || (template && template.cloneNode(true));
      if (!element || typeof item !== "string") return;
      if (kind === "talent") {
        while (element.lastChild && element.lastChild.nodeType === 3) element.removeChild(element.lastChild);
        element.appendChild(document.createTextNode(item));
      } else {
        var icon = element.querySelector("b");
        element.replaceChildren();
        if (icon) element.appendChild(icon);
        element.appendChild(document.createTextNode(item));
      }
      if (!existing[index]) container.appendChild(element);
    });
    existing.slice(items.length).forEach(function (element) { element.remove(); });
  }

  function applyLandingContent(content) {
    if (!content || typeof content !== "object") return;

    var hero = content.hero || {};
    setText(".hero h1", hero.title);
    setText(".hero .lead", hero.lead);
    var heroButtons = document.querySelectorAll(".hero .wrap > div:first-child .btn");
    setLink(heroButtons[0], hero.primaryLabel, hero.primaryHref, false);
    setLink(heroButtons[1], hero.secondaryLabel, hero.secondaryHref, false);

    var about = content.about || {};
    setText("#sobre-mi h2", about.title);
    replaceTextItems(document.querySelector("#sobre-mi .about"), "p", about.paragraphs, "paragraph");
    var facts = document.querySelector("#sobre-mi .facts");
    if (facts && Array.isArray(about.facts)) {
      var existingFacts = Array.from(facts.querySelectorAll("li"));
      var factTemplate = existingFacts[0] && existingFacts[0].cloneNode(true);
      about.facts.forEach(function (fact, index) {
        var item = existingFacts[index] || (factTemplate && factTemplate.cloneNode(true));
        if (!item || !fact || typeof fact.label !== "string" || typeof fact.value !== "string") return;
        var value = document.createElement("span");
        value.textContent = fact.value;
        item.replaceChildren(document.createTextNode(fact.label), value);
        if (!existingFacts[index]) facts.appendChild(item);
      });
      existingFacts.slice(about.facts.length).forEach(function (item) { item.remove(); });
    }

    var projects = content.projects || {};
    setText("#proyectos h2", projects.title);
    var projectContainer = document.querySelector("#proyectos .projects");
    if (projectContainer && Array.isArray(projects.items)) {
      var existingProjects = Array.from(projectContainer.querySelectorAll(".card"));
      var projectTemplate = existingProjects[0] && existingProjects[0].cloneNode(true);
      projects.items.forEach(function (project, index) {
        var card = existingProjects[index] || (projectTemplate && projectTemplate.cloneNode(true));
        if (!card || !project) return;
        var category = card.querySelector("small");
        var title = card.querySelector("h3");
        var description = card.querySelector("p");
        var year = card.querySelector(".yr");
        if (category) category.textContent = project.category || "";
        if (title) title.textContent = project.title || "";
        if (description) description.textContent = project.description || "";
        if (year) year.textContent = project.year || "";
        if (!existingProjects[index]) projectContainer.appendChild(card);
      });
      existingProjects.slice(projects.items.length).forEach(function (card) { card.remove(); });
    }

    var talents = content.talents || {};
    setText("#talentos .wrap > h2:first-child", talents.title);
    replaceTextItems(document.querySelector("#talentos .talents"), ".talent", talents.items, "talent");
    var hobbies = content.hobbies || {};
    setText("#pasatiempos", hobbies.title);
    replaceTextItems(document.querySelector("#talentos .hobbies"), "span", hobbies.items, "hobby");

    var contact = content.contact || {};
    setText(".contact h2", contact.title);
    setText(".contact .wrap > p", contact.description);
    var emailLink = document.querySelector('.cbtns a[href^="mailto:"]');
    var validEmail = typeof contact.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email);
    setLink(emailLink, contact.email, validEmail ? "mailto:" + contact.email : "", false);
    setLink(document.querySelector('.cbtns a[href^="https://"]'), contact.instagramLabel, contact.instagramUrl, true);

    var nameInput = document.getElementById("nombre");
    var emailInput = document.getElementById("email");
    var messageInput = document.getElementById("mensaje");
    var submitButton = document.getElementById("submit-btn");
    if (nameInput && contact.namePlaceholder) nameInput.placeholder = contact.namePlaceholder;
    if (emailInput && contact.emailPlaceholder) emailInput.placeholder = contact.emailPlaceholder;
    if (messageInput && contact.messagePlaceholder) messageInput.placeholder = contact.messagePlaceholder;
    if (submitButton && contact.submitLabel) submitButton.textContent = contact.submitLabel;

    var navigation = content.navigation || {};
    var navList = document.querySelector("nav .wrap ul");
    if (navList && Array.isArray(navigation.items)) {
      var existingLinks = Array.from(navList.querySelectorAll("li"));
      var linkTemplate = existingLinks[0] && existingLinks[0].cloneNode(true);
      navigation.items.forEach(function (item, index) {
        var li = existingLinks[index] || (linkTemplate && linkTemplate.cloneNode(true));
        var anchor = li && li.querySelector("a");
        if (!anchor || !item) return;
        setLink(anchor, item.label, item.href, false);
        if (!existingLinks[index]) navList.appendChild(li);
      });
      existingLinks.slice(navigation.items.length).forEach(function (li) { li.remove(); });
    }
    setText("footer .wrap", content.footer && content.footer.text);
  }

  fetch(builderUrl.replace(/\/$/, "") + "/api/v1/sites/" + encodeURIComponent(siteId))
    .then(function (response) {
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Builder respondió con HTTP " + response.status);
      return response.json();
    })
    .then(function (bundle) {
      if (!bundle) return;
      var section = document.getElementById("cms-content");
      var container = document.getElementById("cms-content-items");
      if (!section || !container) return;
      var pages = (bundle.pages || []).filter(function (page) {
        return page.status === "published";
      });
      var heroPage = pages.find(function (page) {
        return page.type === "landing";
      });
      if (heroPage) {
        var heading = document.querySelector(".hero h1");
        var lead = document.querySelector(".hero .lead");
        if (heading) heading.textContent = heroPage.title;
        if (lead) lead.textContent = heroPage.content || "";
      }
      applyLandingContent(bundle.landingContent);
      var additionalPages = pages.filter(function (page) {
        return page !== heroPage;
      });
      additionalPages.forEach(function (page) {
        var card = document.createElement("article");
        card.className = "cms-page-card";
        var title = document.createElement("h2");
        title.textContent = page.title;
        var content = document.createElement("p");
        content.textContent = page.content || "";
        card.appendChild(title);
        card.appendChild(content);
        container.appendChild(card);
      });
      if (additionalPages.length) section.classList.remove("hidden");
    })
    .catch(function (error) {
      status.textContent = "No se pudo cargar el contenido publicado del CMS: " + error.message;
    });
})();
