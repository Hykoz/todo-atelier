const API = '/api';

let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erreur ' + res.status);
  }
  return data;
}

function notify(text, isError = false) {
  const box = $('message');
  box.textContent = text;
  box.className = 'message ' + (isError ? 'error' : 'ok');
  box.hidden = false;
  setTimeout(() => {
    box.hidden = true;
  }, 4000);
}

function setSession(data) {
  token = data.token;
  currentUser = data.user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(currentUser));
  showApp();
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showApp();
}

function showSearchInfo(search) {
  const container = $('search-info');
  container.textContent = '';
  if (search) {
    container.append('Résultats pour : ');
    const strong = document.createElement('strong');
    strong.textContent = search;
    container.appendChild(strong);
  }
}

function showApp() {
  const logged = Boolean(token && currentUser);
  $('auth-section').hidden = logged;
  $('todo-section').hidden = !logged;
  $('admin-section').hidden = true;
  $('nav').hidden = !logged;
  $('btn-admin').hidden = !(logged && currentUser.role === 'admin');

  if (logged) {
    $('whoami').textContent = 'Connecté : ' + currentUser.username;
    const q = new URLSearchParams(location.search).get('q') || '';
    $('search').value = q;
    loadTodos(q);
  }
}

/* ---------- Tâches ---------- */

async function loadTodos(search = '') {
  showSearchInfo(search);
  try {
    const path = '/todos' + (search ? '?search=' + encodeURIComponent(search) : '');
    renderTodos(await api(path));
  } catch (err) {
    notify(err.message, true);
    if (err.message.startsWith('Jeton')) {
      logout();
    }
  }
}

function renderTodos(todos) {
  const list = $('todo-list');
  list.textContent = '';
  if (todos.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'empty';
    emptyLi.textContent = 'Aucune tâche.';
    list.appendChild(emptyLi);
    return;
  }
  todos.forEach((todo) => {
    const li = document.createElement('li');
    li.className = todo.done ? 'done' : '';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'toggle';
    checkbox.dataset.id = String(todo.id);
    checkbox.checked = Boolean(todo.done);

    const content = document.createElement('div');
    content.className = 'content';
    const strong = document.createElement('strong');
    strong.textContent = todo.title;
    const p = document.createElement('p');
    p.textContent = todo.description || '';
    content.appendChild(strong);
    content.appendChild(p);

    const actions = document.createElement('div');
    actions.className = 'actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'secondary edit';
    editBtn.dataset.id = String(todo.id);
    editBtn.textContent = 'Modifier';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger delete';
    deleteBtn.dataset.id = String(todo.id);
    deleteBtn.textContent = 'Supprimer';
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(checkbox);
    li.appendChild(content);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

$('todo-list').addEventListener('click', async (event) => {
  const id = event.target.dataset.id;
  if (!id) return;
  try {
    if (event.target.classList.contains('delete')) {
      if (!confirm('Supprimer cette tâche ?')) return;
      await api('/todos/' + id, { method: 'DELETE' });
      notify('Tâche supprimée');
      loadTodos($('search').value);
    }
    if (event.target.classList.contains('edit')) {
      const current = event.target.closest('li').querySelector('strong').textContent;
      const title = prompt('Nouveau titre', current);
      if (!title) return;
      await api('/todos/' + id, { method: 'PUT', body: JSON.stringify({ title }) });
      loadTodos($('search').value);
    }
  } catch (err) {
    notify(err.message, true);
  }
});

$('todo-list').addEventListener('change', async (event) => {
  if (!event.target.classList.contains('toggle')) return;
  try {
    await api('/todos/' + event.target.dataset.id, {
      method: 'PUT',
      body: JSON.stringify({ done: event.target.checked }),
    });
    loadTodos($('search').value);
  } catch (err) {
    notify(err.message, true);
  }
});

$('todo-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('/todos', {
      method: 'POST',
      body: JSON.stringify({
        title: $('todo-title').value,
        description: $('todo-description').value,
      }),
    });
    $('todo-form').reset();
    notify('Tâche ajoutée');
    loadTodos($('search').value);
  } catch (err) {
    notify(err.message, true);
  }
});

$('search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  loadTodos($('search').value);
});

/* ---------- Authentification ---------- */

$('tab-login').addEventListener('click', () => {
  $('tab-login').classList.add('active');
  $('tab-register').classList.remove('active');
  $('login-form').hidden = false;
  $('register-form').hidden = true;
});

$('tab-register').addEventListener('click', () => {
  $('tab-register').classList.add('active');
  $('tab-login').classList.remove('active');
  $('register-form').hidden = false;
  $('login-form').hidden = true;
});

$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    setSession(
      await api('/login', {
        method: 'POST',
        body: JSON.stringify({
          username: $('login-username').value,
          password: $('login-password').value,
        }),
      })
    );
  } catch (err) {
    notify(err.message, true);
  }
});

$('register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    setSession(
      await api('/register', {
        method: 'POST',
        body: JSON.stringify({
          username: $('register-username').value,
          email: $('register-email').value,
          password: $('register-password').value,
        }),
      })
    );
  } catch (err) {
    notify(err.message, true);
  }
});

$('btn-logout').addEventListener('click', logout);

/* ---------- Administration ---------- */

$('btn-admin').addEventListener('click', async () => {
  const showAdmin = $('admin-section').hidden;
  $('admin-section').hidden = !showAdmin;
  $('todo-section').hidden = showAdmin;
  if (!showAdmin) return;
  try {
    const users = await api('/admin/users');
    const tbody = $('user-table');
    tbody.textContent = '';
    users.forEach((u) => {
      const tr = document.createElement('tr');

      const tdId = document.createElement('td');
      tdId.textContent = String(u.id);
      const tdUser = document.createElement('td');
      tdUser.textContent = u.username;
      const tdEmail = document.createElement('td');
      tdEmail.textContent = u.email || '';
      const tdRole = document.createElement('td');
      tdRole.textContent = u.role;

      const tdAction = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.className = 'danger';
      delBtn.dataset.id = String(u.id);
      delBtn.textContent = 'Supprimer';
      tdAction.appendChild(delBtn);

      tr.appendChild(tdId);
      tr.appendChild(tdUser);
      tr.appendChild(tdEmail);
      tr.appendChild(tdRole);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  } catch (err) {
    notify(err.message, true);
  }
});

$('user-table').addEventListener('click', async (event) => {
  const id = event.target.dataset.id;
  if (!id || !confirm('Supprimer ce compte ?')) return;
  try {
    await api('/admin/users/' + id, { method: 'DELETE' });
    event.target.closest('tr').remove();
    notify('Compte supprimé');
  } catch (err) {
    notify(err.message, true);
  }
});

showSearchInfo(new URLSearchParams(location.search).get('q') || '');
showApp();
