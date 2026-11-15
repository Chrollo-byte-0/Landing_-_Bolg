(function () {
  "use strict";

  var script = document.currentScript;
  var siteId = script && script.dataset.siteId;
  var builderUrl = script && script.dataset.builderUrl;
  if (!siteId || !builderUrl) return;

  var status = document.getElementById("cms-content-status");
  var params = new URLSearchParams(window.location.search);
  var postSlug = params.get("slug");
  var rootUrl = builderUrl.replace(/\/$/, "") + "/api/v1/sites/" + encodeURIComponent(siteId);
  var legacyPostSlugs = [
    "dia-a-dia-bug", "proyecto-graficador", "noticia-primo-mersenne",
    "criba", "fibonacci", "collatz"
  ];

  fetch(rootUrl)
    .then(function (response) {
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Builder respondió con HTTP " + response.status);
      return response.json();
    })
    .then(function (bundle) {
      if (!bundle) return;
      if (postSlug) {
        renderPost(bundle.posts || []);
        return;
      }
      renderPosts(bundle.posts || [], bundle.categories || []);
    })
    .catch(function (error) {
      if (status) status.textContent = "No se pudieron cargar las publicaciones del CMS: " + error.message;
    });

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
      return new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt);
    });
    published.forEach(function (post) {
      var category = categoriesById[post.categoryId];
      var categorySlug = category ? category.slug : "todo";
      if (categorySlug === "dia-a-dia") categorySlug = "dia";
      var article = document.createElement("article");
      article.className = "entry cms-entry";
      article.dataset.cat = categorySlug;
      var time = document.createElement("time");
      if (post.publishedAt) {
        var date = new Date(post.publishedAt);
        time.dateTime = date.toISOString();
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

  function renderPost(posts) {
    var post = posts.find(function (item) { return item.slug === postSlug && item.status === "published"; });
    if (!post) {
      document.getElementById("cms-post-title").textContent = "Publicación no disponible";
      document.getElementById("cms-post-status").textContent = "Este contenido no existe o todavía no está publicado.";
      return;
    }
    document.title = post.title + " — Código & Teoremas";
    var title = document.getElementById("cms-post-title");
    title.textContent = post.title;
    title.setAttribute("aria-label", post.title);
    document.getElementById("cms-post-excerpt").textContent = post.excerpt || "";
    var content = document.getElementById("cms-post-content");
    content.textContent = post.content || "";
    if (window.renderMathInElement) {
      window.renderMathInElement(content, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ]
      });
    }
    if (legacyPostSlugs.indexOf(post.slug) !== -1) {
      var legacyLink = document.createElement("a");
      legacyLink.className = "cms-post-back";
      legacyLink.href = post.slug + ".html";
      legacyLink.textContent = "Abrir versión original con demostraciones";
      content.insertAdjacentElement("afterend", legacyLink);
    }
    document.getElementById("cms-post-date").textContent = post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })
      : "";
  }
})();
