const { ipcRenderer } = require('electron')

ipcRenderer.on('ADD_APP', (event, app) => {
  addApp(app);
});

function addApp(app) {
  document.getElementById('apps').appendChild(buildAppTemplate(app));
}

function toggleEnable(app) {
  app.status = (app.status === 'disabled') ? 'enabled' : 'disabled';
  document.querySelector(`#app-${app.id} #app-status`).outerHTML = getStatusIcon(app.status);
  document.querySelector(`#app-${app.id} #btnToggleEnable`).innerHTML = getToggleEnableButtonContent(app.status);
  ipcRenderer.send('TOGGLE_ENABLE', app);
}

function remove(app) {
  const appSection = document.getElementById(`app-${app.id}`);
  appSection.parentNode.removeChild(appSection);
  ipcRenderer.send('REMOVE_APP', app);
}

function buildAppTemplate(app) {
  const appSection = document.createElement('section');
  appSection.id = `app-${app.id}`;
  appSection.classList.add('app');
  appSection.innerHTML = `
    <div class="app-info">
      <figure class="app-logo">
        <img src="${app.icon}" alt="${app.name} Icon"/>
      </figure>
      <div class="app-info-text">
        <h3>${app.name}</h3>
        <p>${app.summary}</p>
      </div>
      ${getStatusIcon(app.status)}
    </div>
    <div class="app-actions">
      <button id="btnToggleEnable">${getToggleEnableButtonContent(app.status)}</button>
      <button id="btnRemove"><span class="material-icons-round">delete_forever</span> Delete</button>
    </div>`;

  appSection.addEventListener('click', e => appSection.classList.toggle('opened'));
  appSection.querySelector('#btnToggleEnable').addEventListener('click', e => {
    e.stopPropagation();
    toggleEnable(app);
  });
  appSection.querySelector('#btnRemove').addEventListener('click', e => {
    e.stopPropagation();
    remove(app);
  });
  return appSection;
}

function getToggleEnableButtonContent(status) {
  return (status === 'disabled')
    ? '<span class="material-icons-round">task_alt</span> Enable'
    : '<span class="material-icons-round">block</span> Disable';
}

function getStatusIcon(status) {
  switch (status) {
    case 'connected':
      return `<span id="app-status" class="app-status connected material-icons-round" title="Connected!">power</span>`;
    
    case 'enabled':
      return '<span id="app-status" class="app-status material-icons-round" title="Enabled!">task_alt</span>';

    case 'disabled':
      return '<span id="app-status" class="app-status material-icons-round" title="Disabled!">block</span>'

    default:
      return '<span id="app-status" class="app-status material-icons-round" title="Unknown!">help</span>';
  }
}
