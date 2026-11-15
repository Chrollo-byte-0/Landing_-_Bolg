(function () {
  "use strict";

  var token = sessionStorage.getItem("cms-token");
  var config = { graphqlUrl: "" };
  var blogs = [];
  var selectedBlog = null;
  var items = [];
  var editingId = null;
  var kind = "pages";
  var loginView = document.getElementById("login-view");
  var dashboard = document.getElementById("dashboard");
  var loginStatus = document.getElementById("login-status");
  var contentStatus = document.getElementById("content-status");
  var loginForm = document.getElementById("login-form");
  var form = document.getElementById("content-form");

  function showStatus(element, message, type) {
    element.textContent = message || "";
    element.className = "status" + (type ? " " + type : "");
  }

  function setService(id, online) {
    var dot = document.getElementById(id);
    dot.classList.toggle("online", online);
    dot.classList.toggle("offline", !online);
  }

  function graphql(query, variables) {
    return fetch(config.graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: query, variables: variables || {} })
    }).then(function (response) {
      if (!response.ok) throw new Error("GraphQL respondió con HTTP " + response.status);
      return response.json();
    }).then(function (result) {
      if (result.errors && result.errors.length) throw new Error(result.errors[0].message);
      return result.data;
    });
  }

  function setLoggedIn(loggedIn) {
    loginView.classList.toggle("hidden", loggedIn);
    dashboard.classList.toggle("hidden", !loggedIn);
    document.getElementById("logout").classList.toggle("hidden", !loggedIn);
  }

  function loadBlogs() {
    return graphql("query { blogs { id name slug description } }").then(function (data) {
      blogs = data.blogs;
      var select = document.getElementById("site-select");
      select.replaceChildren();
      blogs.forEach(function (blog) {
        var option = document.createElement("option");
        option.value = blog.id;
        option.textContent = blog.name;
        select.appendChild(option);
      });
      if (!blogs.length) throw new Error("No hay espacios del CMS todavía.");
      selectedBlog = blogs[0];
      select.value = String(selectedBlog.id);
      return loadWorkspace();
    });
  }

  function loadWorkspace() {
    var select = document.getElementById("site-select");
    selectedBlog = blogs.find(function (blog) { return String(blog.id) === select.value; });
    if (!selectedBlog) return Promise.resolve();
    kind = selectedBlog.slug === "landing-isaias" ? "pages" : "posts";
    document.getElementById("site-kind").textContent = kind === "pages" ? "Landing" : "Blog";
    document.getElementById("site-slug").textContent = selectedBlog.slug;
    document.getElementById("content-title").textContent = kind === "pages" ? "Páginas" : "Publicaciones";
    document.getElementById("page-type-field").classList.toggle("hidden", kind !== "pages");
    document.getElementById("excerpt-field").classList.toggle("hidden", kind !== "posts");
    document.getElementById("cover-field").classList.toggle("hidden", kind !== "posts");
    resetEditor();
    setService("graphql-dot", true);
    showStatus(contentStatus, "Cargando contenido…");
    var servicePromise = graphql("query { serviceHealth { cms metrics builder } }").then(function (data) {
      setService("cms-dot", data.serviceHealth.cms);
      setService("metrics-dot", data.serviceHealth.metrics);
      setService("builder-dot", data.serviceHealth.builder);
    }).catch(function () {
      setService("cms-dot", false);
      setService("metrics-dot", false);
      setService("builder-dot", false);
    });
    var metricsPromise = graphql("query($id: Int!) { metrics(blogId: $id) { visitas visitantesUnicos simulated } }", { id: selectedBlog.id }).then(function (data) {
      document.getElementById("views").textContent = Number(data.metrics.visitas).toLocaleString("es-MX");
      document.getElementById("visitors").textContent = Number(data.metrics.visitantesUnicos).toLocaleString("es-MX");
      document.getElementById("metric-mode").textContent = data.metrics.simulated ? "Sin conexión al servicio de métricas" : "Datos reales del sitio";
    }).catch(function (error) {
      document.getElementById("views").textContent = "—";
      document.getElementById("visitors").textContent = "—";
      document.getElementById("metric-mode").textContent = error.message;
    });
    var contentQuery = kind === "pages"
      ? "query($id: Int!) { pages(blogId: $id) { id title slug type status content } }"
      : "query($id: Int!) { posts(blogId: $id) { id title slug status excerpt coverUrl createdAt } }";
    var contentPromise = graphql(contentQuery, { id: selectedBlog.id }).then(function (data) {
      items = kind === "pages" ? data.pages : data.posts;
      renderItems();
      showStatus(contentStatus, "");
    }).catch(function (error) {
      showStatus(contentStatus, error.message, "error");
    });
    return Promise.all([servicePromise, metricsPromise, contentPromise]);
  }

  function addAction(parent, label, action, className) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "mini-button" + (className ? " " + className : "");
    button.textContent = label;
    button.addEventListener("click", action);
    parent.appendChild(button);
  }

  function renderItems() {
    var list = document.getElementById("content-list");
    list.replaceChildren();
    document.getElementById("content-count").textContent = items.length + (items.length === 1 ? " elemento" : " elementos");
    if (!items.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = kind === "pages" ? "Todavía no hay páginas. Crea la primera desde el formulario." : "Todavía no hay publicaciones. Crea la primera desde el formulario.";
      list.appendChild(empty);
      return;
    }
    items.forEach(function (item) {
      var card = document.createElement("article");
      card.className = "content-item";
      var top = document.createElement("div");
      top.className = "item-top";
      var title = document.createElement("span");
      title.className = "item-title";
      title.textContent = item.title;
      top.appendChild(title);
      var actions = document.createElement("div");
      actions.className = "item-actions";
      addAction(actions, "Editar", function () { editItem(item); });
      addAction(actions, "Borrar", function () { removeItem(item); }, "delete");
      top.appendChild(actions);
      var meta = document.createElement("div");
      meta.className = "item-meta";
      var slug = document.createElement("span");
      slug.textContent = "/" + item.slug;
      meta.appendChild(slug);
      var badge = document.createElement("span");
      badge.className = "badge" + (item.status === "published" ? " published" : "");
      badge.textContent = item.status === "published" ? "Publicado" : "Borrador";
      meta.appendChild(badge);
      if (kind === "pages") {
        var pageType = document.createElement("span");
        pageType.textContent = item.type === "landing" ? "Landing principal" : "Página";
        meta.appendChild(pageType);
      }
      card.appendChild(top);
      card.appendChild(meta);
      list.appendChild(card);
    });
  }

  function editItem(item) {
    if (kind === "posts") {
      graphql("query($blog: Int!, $id: Int!) { post(blogId: $blog, postId: $id) { id title slug status excerpt coverUrl categoryId content } }",
        { blog: selectedBlog.id, id: item.id }).then(function (data) {
        fillEditor(data.post);
      }).catch(function (error) {
        showStatus(contentStatus, error.message, "error");
      });
      return;
    }
    fillEditor(item);
  }

  function fillEditor(item) {
    editingId = item.id;
    document.getElementById("editor-title").textContent = "Editar contenido";
    document.getElementById("item-title").value = item.title || "";
    document.getElementById("item-slug").value = item.slug || "";
    document.getElementById("item-status").value = item.status || "draft";
    document.getElementById("item-content").value = item.content || "";
    if (kind === "pages") {
      document.getElementById("page-type").value = item.type || "page";
    } else {
      document.getElementById("item-excerpt").value = item.excerpt || "";
      document.getElementById("item-cover").value = item.coverUrl || "";
      document.getElementById("item-category").value = item.categoryId || "";
    }
    document.getElementById("cancel-edit").classList.remove("hidden");
    document.getElementById("item-title").focus();
  }

  function resetEditor() {
    editingId = null;
    form.reset();
    document.getElementById("editor-title").textContent = "Crear contenido";
    document.getElementById("cancel-edit").classList.add("hidden");
    showStatus(contentStatus, "");
  }

  function removeItem(item) {
    if (!window.confirm("¿Borrar «" + item.title + "»? Esta acción no se puede deshacer.")) return;
    var mutation = kind === "pages"
      ? "mutation($blog: Int!, $id: Int!) { deletePage(blogId: $blog, pageId: $id) }"
      : "mutation($blog: Int!, $id: Int!) { deletePost(blogId: $blog, postId: $id) }";
    graphql(mutation, { blog: selectedBlog.id, id: item.id }).then(loadWorkspace).catch(function (error) {
      showStatus(contentStatus, error.message, "error");
    });
  }

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    showStatus(loginStatus, "Validando acceso…");
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value
      })
    }).then(function (response) {
      if (!response.ok) throw new Error("Correo o contraseña incorrectos.");
      return response.json();
    }).then(function (data) {
      token = data.accessToken;
      sessionStorage.setItem("cms-token", token);
      showStatus(loginStatus, "");
      setLoggedIn(true);
      document.getElementById("current-user").textContent = document.getElementById("email").value.trim();
      return loadBlogs();
    }).catch(function (error) {
      showStatus(loginStatus, error.message, "error");
      setLoggedIn(false);
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var input = {
      title: document.getElementById("item-title").value.trim(),
      slug: document.getElementById("item-slug").value.trim() || null,
      content: document.getElementById("item-content").value,
      status: document.getElementById("item-status").value
    };
    var mutation;
    var variables;
    if (kind === "pages") {
      input.type = document.getElementById("page-type").value;
      mutation = editingId
        ? "mutation($blog: Int!, $id: Int!, $input: PageInput!) { updatePage(blogId: $blog, pageId: $id, input: $input) { id } }"
        : "mutation($blog: Int!, $input: PageInput!) { createPage(blogId: $blog, input: $input) { id } }";
    } else {
      input.excerpt = document.getElementById("item-excerpt").value.trim() || null;
      input.coverUrl = document.getElementById("item-cover").value.trim() || null;
      var categoryId = document.getElementById("item-category").value;
      input.categoryId = categoryId ? Number(categoryId) : null;
      mutation = editingId
        ? "mutation($blog: Int!, $id: Int!, $input: PostInput!) { updatePost(blogId: $blog, postId: $id, input: $input) { id } }"
        : "mutation($blog: Int!, $input: PostInput!) { createPost(blogId: $blog, input: $input) { id } }";
    }
    variables = { blog: selectedBlog.id, input: input };
    if (editingId) variables.id = editingId;
    showStatus(contentStatus, "Guardando…");
    graphql(mutation, variables).then(function () {
      resetEditor();
      return loadWorkspace();
    }).catch(function (error) {
      showStatus(contentStatus, error.message, "error");
    });
  });

  document.getElementById("cancel-edit").addEventListener("click", resetEditor);
  document.getElementById("site-select").addEventListener("change", loadWorkspace);
  document.getElementById("logout").addEventListener("click", function () {
    sessionStorage.removeItem("cms-token");
    token = null;
    setLoggedIn(false);
  });

  fetch("/api/admin-config").then(function (response) {
    if (!response.ok) throw new Error("No se pudo cargar la configuración del panel.");
    return response.json();
  }).then(function (data) {
    config.graphqlUrl = data.graphqlUrl;
    config.builderUrl = data.builderUrl;
    document.getElementById("graphql-link").href = data.graphqlUrl;
    document.getElementById("builder-link").href = data.builderUrl + "/health";
    var metricsUrl = new URL("/docs", window.location.protocol + "//" + window.location.hostname + ":8012");
    document.getElementById("metrics-link").href = metricsUrl.href;
    if (token) {
      setLoggedIn(true);
      document.getElementById("current-user").textContent = "Sesión activa";
      return loadBlogs().catch(function (error) {
        sessionStorage.removeItem("cms-token");
        token = null;
        setLoggedIn(false);
        showStatus(loginStatus, error.message, "error");
      });
    }
  }).catch(function (error) {
    showStatus(loginStatus, error.message, "error");
  });

  document.getElementById("publish-site").addEventListener("click", function () {
    if (!selectedBlog) return;
    var button = document.getElementById("publish-site");
    button.disabled = true;
    showStatus(contentStatus, "Publicando el contenido de " + selectedBlog.name + "…");
    fetch("/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ blogId: selectedBlog.id })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.message || data.detail || "No se pudo publicar el sitio.");
        return data;
      });
    }).then(function (build) {
      if (build.result && build.result.simulated) {
        throw new Error(build.result.message || "El Builder respondió en modo simulado.");
      }
      showStatus(contentStatus, "Sitio " + selectedBlog.slug + " publicado. Visita la landing o el blog para ver los cambios.", "success");
      setService("builder-dot", true);
    }).catch(function (error) {
      showStatus(contentStatus, error.message, "error");
      setService("builder-dot", false);
    }).finally(function () {
      button.disabled = false;
    });
  });
})();
