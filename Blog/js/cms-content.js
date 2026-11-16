(function () {
  "use strict";

  var script = document.currentScript;
  var siteId = script && script.dataset.siteId;
  var builderUrl = script && script.dataset.builderUrl;
  var contentUrl = script && script.dataset.contentUrl;
  if (!contentUrl && (!siteId || !builderUrl)) return;

  var status = document.getElementById("cms-content-status") ||
    document.getElementById("cms-post-status");
  var params = new URLSearchParams(window.location.search);
  var postSlug = params.get("slug");
  var rootUrl = contentUrl
    ? new URL(contentUrl, window.location.href).toString()
    : builderUrl.replace(/\/$/, "") + "/api/v1/sites/" + encodeURIComponent(siteId);

  fetch(rootUrl)
    .then(function (response) {
      if (response.status === 404) {
        throw new Error("No se encontró el archivo de contenido publicado.");
      }
      if (!response.ok) throw new Error("Builder respondió con HTTP " + response.status);
      return response.json();
    })
    .then(function (bundle) {
      applySiteMetadata(bundle.site);
      if (postSlug) {
        renderPost(bundle.posts || [], bundle.site);
        return;
      }
      renderPosts(bundle.posts || [], bundle.categories || []);
    })
    .catch(function (error) {
      if (status) status.textContent = "No se pudieron cargar las publicaciones del CMS: " + error.message;
    });

  function parseDate(value) {
    if (typeof value !== "string") return null;
    var match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var date = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function applySiteMetadata(site) {
    if (!site || typeof site !== "object") return;
    if (typeof site.title === "string") document.title = site.title;
    if (typeof site.name === "string") {
      document.querySelectorAll(".logo").forEach(function (logo) {
        var textNode = Array.from(logo.childNodes).find(function (node) { return node.nodeType === 3; });
        if (textNode) textNode.nodeValue = site.name;
      });
    }
    if (typeof site.footer === "string") {
      var footer = document.querySelector("footer .wrap");
      if (footer) footer.textContent = site.footer;
    }
    var description = document.querySelector('meta[name="description"]');
    if (description && typeof site.description === "string") description.content = site.description;
    var heading = document.querySelector(".intro h1");
    if (heading && typeof site.heading === "string") heading.textContent = site.heading;
    var intro = document.querySelector(".intro > p");
    if (intro && typeof site.intro === "string") intro.textContent = site.intro;
    var formula = document.querySelector(".intro .formula");
    if (formula && typeof site.formula === "string") {
      formula.textContent = site.formula;
      renderMath(formula);
    }
  }

  function renderMath(element) {
    if (window.renderMathInElement) {
      window.renderMathInElement(element, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ]
      });
    }
  }

  function renderPosts(posts, categories) {
    var list = document.getElementById("entradas");
    if (!list) return;
    list.querySelectorAll(".entry").forEach(function (entry) {
      entry.remove();
    });

    var categoriesById = Object.create(null);
    categories.forEach(function (category) {
      categoriesById[category.id] = category;
    });
    var published = posts.filter(function (post) { return post.status === "published"; });
    published.sort(function (a, b) {
      var first = parseDate(b.publishedAt || b.createdAt);
      var second = parseDate(a.publishedAt || a.createdAt);
      return (first ? first.getTime() : 0) - (second ? second.getTime() : 0);
    });
    published.forEach(function (post) {
      var category = categoriesById[post.categoryId];
      var categorySlug = category ? category.slug : "todo";
      if (categorySlug === "dia-a-dia") categorySlug = "dia";
      var article = document.createElement("article");
      article.className = "entry cms-entry";
      article.dataset.cat = categorySlug;
      var time = document.createElement("time");
      var date = parseDate(post.publishedAt);
      if (date) {
        time.dateTime = post.publishedAt;
        time.textContent = date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
      } else {
        time.textContent = "CMS";
      }
      var body = document.createElement("div");
      var heading = document.createElement("h3");
      var link = document.createElement("a");
      link.href = "posts/cms-post.html?slug=" + encodeURIComponent(post.slug);
      link.textContent = post.title;
      var tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = category ? category.name : "CMS";
      heading.appendChild(link);
      heading.appendChild(document.createTextNode(" "));
      heading.appendChild(tag);
      var excerpt = document.createElement("p");
      excerpt.textContent = post.excerpt || "";
      body.appendChild(heading);
      body.appendChild(excerpt);
      article.appendChild(time);
      article.appendChild(body);
      list.appendChild(article);
    });
    if (status) {
      status.textContent = published.length
        ? published.length + (published.length === 1 ? " publicación" : " publicaciones") + " del CMS"
        : "Todavía no hay publicaciones del CMS.";
    }
  }

  function renderPost(posts, site) {
    var post = posts.find(function (item) { return item.slug === postSlug && item.status === "published"; });
    if (!post) {
      document.getElementById("cms-post-title").textContent = "Publicación no disponible";
      status.textContent = "Este contenido no existe o todavía no está publicado.";
      return;
    }
    document.title = post.title + " — " + (site && site.title ? site.title : "Código & Teoremas");
    var title = document.getElementById("cms-post-title");
    title.textContent = post.title;
    title.setAttribute("aria-label", post.title);
    document.getElementById("cms-post-excerpt").textContent = post.excerpt || "";
    var content = document.getElementById("cms-post-content");
    if (!window.DOMPurify) {
      content.textContent = post.content || "";
      status.textContent = "No se pudo cargar el filtro de seguridad; el contenido se muestra como texto.";
      return;
    }
    content.innerHTML = window.DOMPurify.sanitize(post.content || "", { USE_PROFILES: { html: true } });
    renderMath(content);
    window.dispatchEvent(new Event("cms-content-rendered"));
    var date = parseDate(post.publishedAt);
    var dateElement = document.getElementById("cms-post-date");
    dateElement.textContent = date
      ? date.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })
      : "";
    dateElement.dateTime = date ? post.publishedAt : "";
  }
})();
