(function () {
  "use strict";

  var script = document.currentScript;
  var siteId = script && script.dataset.siteId;
  var builderUrl = script && script.dataset.builderUrl;
  var status = document.getElementById("cms-content-status");
  if (!siteId || !builderUrl || !status) return;

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
        return page.status === "published" && page.type === "landing";
      });
      var heroPage = pages[0];
      if (heroPage) {
        var heading = document.querySelector(".hero h1");
        var lead = document.querySelector(".hero .lead");
        if (heading) heading.textContent = heroPage.title;
        if (lead) lead.textContent = heroPage.content || "";
      }
      var additionalPages = pages.slice(1);
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
