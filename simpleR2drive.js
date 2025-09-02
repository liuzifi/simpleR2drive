=================================================================
后端 WORKER 脚本 (登录验证版)
=================================================================
export default {
async fetch(request, env, ctx) {
const url = new URL(request.url);
const pathSegments = url.pathname.split('').filter(Boolean);

--- 登录验证 ---
如果是 API 请求，则进行密码验证
if (pathSegments[0] === 'api') {
const authResponse = handleAuth(request, env);
if (authResponse) {
return authResponse;  如果验证失败，则直接返回错误响应
}
}

--- 路由逻辑 ---
if (pathSegments[0] !== 'api') {
非 API 请求，返回前端 HTML
return new Response(getHtml(env), {  传递 env 以便前端知道是否需要密码
headers { 'Content-Type' 'texthtml;charset=UTF-8' },
});
}

const action = pathSegments[1];

try {
验证通过后，执行相应的 API 操作
switch (action) {
case 'list'
return await handleList(request, env);
case 'upload'
return await handleUpload(request, env);
case 'delete'
return await handleDelete(request, env);
case 'download'
const encodedKey = url.pathname.substring('apidownload'.length);
const objectKey = decodeURIComponent(encodedKey);
if (!objectKey) {
return new Response('File path is missing.', { status 400 });
}
下载通常是公开的，所以不放在密码保护下。如果需要保护，请将 handleAuth 移到路由逻辑之外。
return await handleDownload(request, env, objectKey);
default
return new Response('API action not found.', { status 404 });
}
} catch (e) {
console.error(`Error in action '${action}'`, e);
return new Response(e.message  'Internal Server Error', { status 500 });
}
},
};

--- 认证处理函数 ---
function handleAuth(request, env) {
如果没有设置 PASSWORD 环境变量，则不进行验证
if (!env.PASSWORD) {
return null;
}

下载请求和检查登录状态的请求不进行验证
const url = new URL(request.url);
if (url.pathname.startsWith('apidownload')  url.pathname === 'apicheck-auth') {
return null;
}

const password = request.headers.get('Authorization');
if (password !== env.PASSWORD) {
return new Response('Unauthorized', { status 401 });
}

return null;  验证通过
}


--- API 处理函数 (保持不变) ---

async function handleList(request, env) {
const url = new URL(request.url);
const path = url.searchParams.get('path')  '';
const list = await env.MY_DRIVE_BUCKET.list({ prefix path, delimiter '' });
const files = list.objects.map(obj = ({ name obj.key.substring(path.length), path obj.key, size obj.size, type 'file', uploaded obj.uploaded }));
const folders = list.delimitedPrefixes.map(prefix = ({ name prefix.substring(path.length), path prefix, type 'folder' }));
return new Response(JSON.stringify([...folders, ...files]), { headers { 'Content-Type' 'applicationjson' } });
}

async function handleUpload(request, env) {
if (request.method !== 'POST') return new Response('Method Not Allowed', { status 405 });
const url = new URL(request.url);
const path = url.searchParams.get('path');
if (!path) return new Response('Path is required', { status 400 });
if (request.headers.get('X-Create-Folder') === 'true') {
await env.MY_DRIVE_BUCKET.put(path, null);
return new Response(`Folder ${path} created.`, { status 201 });
}
await env.MY_DRIVE_BUCKET.put(path, request.body);
return new Response(`File ${path} uploaded.`, { status 201 });
}

async function handleDelete(request, env) {
if (request.method !== 'DELETE') return new Response('Method Not Allowed', { status 405 });
const url = new URL(request.url);
const path = url.searchParams.get('path');
if (!path) return new Response('Path is required', { status 400 });
await env.MY_DRIVE_BUCKET.delete(path);
return new Response(`Deleted ${path}`, { status 200 });
}

async function handleDownload(request, env, objectKey) {
const object = await env.MY_DRIVE_BUCKET.get(objectKey);
if (object === null) {
return new Response('Object Not Found', { status 404 });
}
const headers = new Headers();
object.writeHttpMetadata(headers);
headers.set('etag', object.httpEtag  );
const isInline = new URL(request.url).searchParams.get('inline') === 'true';
const isImage = object.httpMetadata.contentType.startsWith('image'  );
if (!isInline && !isImage) {
headers.set('Content-Disposition', `attachment; filename=${objectKey.split('').pop()}`);
}
return new Response(object.body, { headers });
}

=================================================================
前端 HTML, CSS, JS (UI 切换修复版)
=================================================================
function getHtml(env) {
const passwordEnabled = !!env.PASSWORD;
return `
!DOCTYPE html
html lang=zh-CN
head
meta charset=UTF-8
meta name=viewport content=width=device-width, initial-scale=1.0
title我的公开网盘title
style
body { font-family -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; margin 0; background-color #f0f2f5; color #333; }
.container { max-width 800px; margin 2rem auto; padding 2rem; background-color #fff; border-radius 8px; box-shadow 0 4px 12px rgba(0,0,0,0.1); }
h1 { text-align center; }
button { padding 10px 15px; border none; background-color #007bff; color #fff; border-radius 4px; cursor pointer; transition background-color 0.2s; }
buttonhover { background-color #0056b3; }
buttondisabled { background-color #ccc; cursor not-allowed; }
#file-list { list-style none; padding 0; }
#file-list li { display flex; align-items center; padding 12px 8px; border-bottom 1px solid #eee; transition background-color 0.2s; }
#file-list lihover { background-color #f8f9fa; }
#file-list li .icon { width 30px; font-size 20px; text-align center; }
#file-list li .name { flex-grow 1; cursor pointer; word-break break-all; padding 0 10px; }
#file-list li .namehover { text-decoration underline; }
#file-list li .size { width 80px; text-align right; color #6c757d; font-size 14px; }
#file-list li .actions { display flex; flex-shrink 0; }
#file-list li .actions button { margin-left 8px; padding 5px 8px; font-size 12px; }
.btn-delete { background-color #dc3545; } .btn-deletehover { background-color #c82333; }
.btn-copy { background-color #28a745; } .btn-copyhover { background-color #218838; }
#breadcrumb { margin-bottom 1rem; color #555; word-break break-all; }
#breadcrumb a { color #007bff; text-decoration none; }
#preview-modal { display none; position fixed; z-index 1000; left 0; top 0; width 100%; height 100%; background-color rgba(0,0,0,0.85); justify-content center; align-items center; }
#preview-modal.visible { display flex; }
#preview-modal img { max-width 90%; max-height 90%; border-radius 4px; }
#preview-modal .close { position absolute; top 20px; right 35px; color #fff; font-size 40px; font-weight bold; cursor pointer; }
.actions-bar { display flex; gap 10px; margin-bottom 1rem; flex-wrap wrap; align-items center; }
#file-upload { display none; }
#drag-overlay { position fixed; top 0; left 0; width 100%; height 100%; background rgba(0, 123, 255, 0.1); border 3px dashed #007bff; z-index 9999; display none; justify-content center; align-items center; font-size 2rem; color #007bff; font-weight bold; }
#drag-overlay.visible { display flex; }
.sort-container { display flex; align-items center; gap 10px; }
.sort-select { padding 8px; border-radius 4px; border 1px solid #ccc; }
#search-box { padding 8px; border-radius 4px; border 1px solid #ccc; flex-grow 1; }
#login-form { text-align center; padding 2rem; }
#login-form input { padding 10px; width 200px; margin-right 10px; border 1px solid #ccc; border-radius 4px; }
#login-error { color red; margin-top 10px; }
.mobile-actions { display none; background none; border none; font-size 18px; cursor pointer; padding 0 10px; }
.actions-menu { position absolute; right 10px; background white; border-radius 4px; box-shadow 0 2px 10px rgba(0,0,0,0.2); z-index 100; display none; flex-direction column; min-width 120px; }
.actions-menu button { width 100%; text-align left; border-radius 0; background none; color #333; border-bottom 1px solid #eee; }
.actions-menu buttonlast-child { border-bottom none; }
.actions-menu buttonhover { background-color #f8f9fa; }
#logout-btn { background-color #6c757d; margin-left auto; }
#logout-btnhover { background-color #5a6268; }

--- UI 切换修复 --- 
1. 默认隐藏所有移动端专用元素 
.mobile-actions-grid,
.mobile-search-sort-grid,
#logout-btn-mobile {
display none;
}

@media (max-width 768px) {
.container { padding 1rem; margin 1rem auto; }
#file-list li { padding 10px 5px; }
#file-list li .size { width 60px; font-size 12px; }
#file-list li .actions { display none; }
.mobile-actions { display block; color #000; }

--- UI 切换修复 --- 
2. 隐藏桌面端操作栏 
.actions-bar {
 display none;
}

3. 显示移动端操作栏 
.mobile-actions-grid {
 display grid;
 grid-template-columns 1fr 1fr;
 gap 10px;
 margin-bottom 1rem;
}
.mobile-search-sort-grid {
 display grid;
 grid-template-columns 1fr auto;
 gap 10px;
 margin-bottom 1rem;
}
#logout-btn-mobile {
 display block;
 width 100%;
 background-color #6c757d;
}

.mobile-actions-grid button { width 100%; }
.mobile-search-sort-grid #search-box-mobile { width 100%; box-sizing border-box; }
.mobile-search-sort-grid .sort-container { width 100%; }
.mobile-search-sort-grid .sort-select { width 100%; }
}
style
head
body
div class=container id=drop-zone
h1我的公开网盘h1

div id=login-view
form id=login-form onsubmit=handleLogin(event)
 p请输入访问密码p
 input type=password id=password-input placeholder=密码 required
 button type=submit登录button
 p id=login-error style=display none;p
form
div

div id=drive-view style=display none;
div id=breadcrumbdiv

!-- 桌面端操作栏 --
div class=actions-bar
 button onclick=document.getElementById('file-upload').click()上传文件button
 input type=file id=file-upload onchange=handleFiles(this.files) multiple
 button onclick=createFolder()新建文件夹button
 input type=text id=search-box placeholder=搜索文件... oninput=handleSearch(this.value)
 div class=sort-container
     select id=sort-select class=sort-select onchange=handleSort(event)
         option value=name-asc名称 (A-Z)option
         option value=name-desc名称 (Z-A)option
         option value=size-asc大小 (小到大)option
         option value=size-desc大小 (大到小)option
         option value=date-asc日期 (旧到新)option
         option value=date-desc日期 (新到旧)option
     select
 div
 button id=logout-btn onclick=handleLogout()退出登录button
div

!-- 移动端操作栏 --
div class=mobile-actions-grid
 button onclick=document.getElementById('file-upload-mobile').click()上传文件button
 input type=file id=file-upload-mobile style=displaynone; onchange=handleFiles(this.files) multiple
 button onclick=createFolder()新建文件夹button
div
div class=mobile-search-sort-grid
 input type=text id=search-box-mobile placeholder=搜索文件... oninput=handleSearch(this.value)
 div class=sort-container
     select id=sort-select-mobile class=sort-select onchange=handleSort(event)
         option value=name-asc名称 (A-Z)option
         option value=name-desc名称 (Z-A)option
         option value=size-asc大小 (小到大)option
         option value=size-desc大小 (大到小)option
         option value=date-asc日期 (旧到新)option
         option value=date-desc日期 (新到旧)option
     select
 div
div
button id=logout-btn-mobile onclick=handleLogout()退出登录button

ul id=file-listul
div
div
div id=preview-modal onclick=closePreview()
span class=close&times;span
img id=preview-image src=
div
div id=drag-overlay拖拽到此处以上传div

script
JavaScript 部分与上一版完全相同，无需修改
const PASSWORD_ENABLED = ${passwordEnabled};
let currentPath = '';
let allFiles = [];
let currentSort = 'name-asc';

async function fetchApi(path, options = {}) {
const headers = new Headers(options.headers  {});
const password = localStorage.getItem('drive-password');
if (password) {
 headers.set('Authorization', password);
}

const finalOptions = { ...options, headers };
const response = await fetch(path, finalOptions);

if (response.status === 401) {
 localStorage.removeItem('drive-password');
 showLoginView(密码错误或已失效，请重新登录。);
 throw new Error(Unauthorized);
}

if (!response.ok) {
 const errorText = await response.text();
 throw new Error(API Error  + response.status +  -  + errorText);
}
return response;
}

function showLoginView(errorMessage = '') {
document.getElementById('drive-view').style.display = 'none';
document.getElementById('login-view').style.display = 'block';
const errorEl = document.getElementById('login-error');
if (errorMessage) {
 errorEl.textContent = errorMessage;
 errorEl.style.display = 'block';
} else {
 errorEl.style.display = 'none';
}
}

function showDriveView() {
document.getElementById('login-view').style.display = 'none';
document.getElementById('drive-view').style.display = 'block';
}

async function handleLogin(event) {
event.preventDefault();
const password = document.getElementById('password-input').value;
localStorage.setItem('drive-password', password);

try {
 await fetchFiles('');
 showDriveView();
} catch (e) {
 if (e.message !== Unauthorized) {
     alert(发生未知错误  + e.message);
 }
}
}

function handleLogout() {
localStorage.removeItem('drive-password');
showLoginView(您已成功退出。);
}

async function fetchFiles(path) {
currentPath = path;
try {
 const response = await fetchApi(apilistpath= + encodeURIComponent(path));
 const files = await response.json();
 allFiles = files;
 renderFiles(files);
 renderBreadcrumb();
} catch (e) {
 if (e.message !== Unauthorized) {
     alert(加载文件列表失败  + e.message);
 }
 throw e;
}
}

function handleSearch(query) {
document.getElementById('search-box').value = query;
document.getElementById('search-box-mobile').value = query;
const filteredItems = allFiles.filter(item = item.name.toLowerCase().includes(query.toLowerCase()));
renderFiles(filteredItems);
}
function handleSort(event) {
const newSort = event.target.value;
currentSort = newSort;
document.getElementById('sort-select').value = newSort;
document.getElementById('sort-select-mobile').value = newSort;
const currentQuery = document.getElementById('search-box').value;
const itemsToRender = currentQuery  allFiles.filter(item = item.name.toLowerCase().includes(currentQuery.toLowerCase()))  allFiles;
renderFiles(itemsToRender);
}
function formatSize(bytes) {
if (bytes === 0  !bytes) return '0 B';
const k = 1024;
const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
const i = Math.floor(Math.log(bytes)  Math.log(k));
return parseFloat((bytes  Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
function renderFiles(items) {
const fileList = document.getElementById('file-list');
fileList.innerHTML = '';
items.sort((a, b) = {
 if (a.type === 'folder' && b.type !== 'folder') return -1;
 if (b.type === 'folder' && a.type !== 'folder') return 1;
 const [sortField, sortDirection] = currentSort.split('-');
 const direction = sortDirection === 'asc'  1  -1;
 switch (sortField) {
     case 'name' return direction  a.name.localeCompare(b.name);
     case 'size' return direction  ((a.size  0) - (b.size  0));
     case 'date' return direction  (new Date(a.uploaded  0) - new Date(b.uploaded  0));
     default return a.name.localeCompare(b.name);
 }
});
items.forEach(item = {
 const li = document.createElement('li');
 li.innerHTML = `
     span class=icon${item.type === 'folder'  '📁'  '📄'}span
     span class=name${item.name}span
     span class=size${item.type === 'file'  formatSize(item.size)  ''}span
     div class=actionsdiv
     button class=mobile-actions&#8942;button
     div class=actions-menudiv
 `;
 const nameSpan = li.querySelector('.name');
 if (item.type === 'folder') {
     nameSpan.onclick = () = fetchFiles(item.path);
 } else {
     nameSpan.onclick = () = window.open(buildDownloadUrl(item.path, true), '_blank');
 }
 const actionsDiv = li.querySelector('.actions');
 const actionsMenu = li.querySelector('.actions-menu');
 const actionButtons = [];
 if (item.type === 'file') {
     if (.(jpegpnggifwebpsvg)$i.test(item.name)) {
         actionButtons.push({ text '预览', handler () = previewImage(item.path) });
     }
     actionButtons.push({ text '下载', handler () = downloadFile(item.path) });
     actionButtons.push({ text '复制链接', handler (e) = copyLink(e.target, item.path), className 'btn-copy' });
 }
 actionButtons.push({ text '删除', handler () = deleteItem(item.path), className 'btn-delete' });
 actionButtons.forEach(btnInfo = {
     const desktopBtn = document.createElement('button');
     desktopBtn.textContent = btnInfo.text;
     if(btnInfo.className) desktopBtn.className = btnInfo.className;
     desktopBtn.onclick = btnInfo.handler;
     actionsDiv.appendChild(desktopBtn);
     const mobileBtn = document.createElement('button');
     mobileBtn.textContent = btnInfo.text;
     mobileBtn.onclick = (e) = {
         actionsMenu.style.display = 'none';
         btnInfo.handler(e);
     };
     actionsMenu.appendChild(mobileBtn);
 });
 const mobileActionsBtn = li.querySelector('.mobile-actions');
 mobileActionsBtn.onclick = (e) = {
     e.stopPropagation();
     document.querySelectorAll('.actions-menu').forEach(menu = {
         if (menu !== actionsMenu) menu.style.display = 'none';
     });
     actionsMenu.style.display = actionsMenu.style.display === 'flex'  'none'  'flex';
 };
 fileList.appendChild(li);
});
}
document.addEventListener('click', (e) = {
if (!e.target.closest('.mobile-actions')) {
 document.querySelectorAll('.actions-menu').forEach(menu = menu.style.display = 'none');
}
});
function renderBreadcrumb() {
const breadcrumb = document.getElementById('breadcrumb');
breadcrumb.innerHTML = 'a href=# onclick=event.preventDefault(); fetchFiles('')根目录a';
const parts = currentPath.split('').filter(p = p);
let path = '';
parts.forEach(part = {
 path += part + '';
 const finalPath = path;
 breadcrumb.innerHTML += '  a href=# onclick=event.preventDefault(); fetchFiles('' + finalPath + '')' + part + 'a';
});
}
async function handleFiles(files) {
if (!files  files.length === 0) return;
for (const file of files) {
 const filePath = currentPath + file.name;
 try {
     await fetchApi(apiuploadpath= + encodeURIComponent(filePath), { method 'POST', body file });
 } catch (e) {
     if (e.message !== Unauthorized) {
        alert(上传文件 ' + file.name + ' 失败  + e.message);
     }
 }
}
alert('所有文件处理完毕!');
if (localStorage.getItem('drive-password')  !PASSWORD_ENABLED) {
 fetchFiles(currentPath);
}
document.getElementById('file-upload').value = '';
document.getElementById('file-upload-mobile').value = '';
}
async function createFolder() {
const folderName = prompt('请输入新文件夹的名称');
if (!folderName  !folderName.trim()) return;
const folderPath = currentPath + folderName.trim() + '';
try {
 await fetchApi(apiuploadpath= + encodeURIComponent(folderPath), { method 'POST', headers { 'X-Create-Folder' 'true' } });
 fetchFiles(currentPath);
} catch (e) {
  if (e.message !== Unauthorized) {
     alert('创建失败 ' + e.message);
 }
}
}
async function deleteItem(path) {
const confirmMsg = 确定要删除 ' + path.split('').filter(p=p).pop() + ' 吗？此操作无法撤销。;
if (!confirm(confirmMsg)) return;
try {
 await fetchApi(apideletepath= + encodeURIComponent(path), { method 'DELETE' });
 fetchFiles(currentPath);
} catch (e) {
 if (e.message !== Unauthorized) {
     alert('删除失败 ' + e.message);
 }
}
}
function buildDownloadUrl(path, inline = false) {
const encodedPath = path.split('').map(segment = encodeURIComponent(segment)).join('');
let url = apidownload + encodedPath;
if (inline) url += 'inline=true';
return url;
}
function downloadFile(path) { window.open(buildDownloadUrl(path)); }
function previewImage(path) {
const modal = document.getElementById('preview-modal');
const img = document.getElementById('preview-image');
img.src = buildDownloadUrl(path, true);
modal.classList.add('visible');
}
function copyLink(button, path) {
const url = new URL(buildDownloadUrl(path), window.location.origin).href;
navigator.clipboard.writeText(url).then(() = {
 const originalText = button.textContent;
 button.textContent = '已复制!';
 button.disabled = true;
 setTimeout(() = {
     button.textContent = originalText;
     button.disabled = false;
 }, 2000);
}).catch(err = alert('复制失败 ' + err));
}
function closePreview() {
document.getElementById('preview-modal').classList.remove('visible');
document.getElementById('preview-image').src = '';
}
const dropZone = document.body;
const dragOverlay = document.getElementById('drag-overlay');
dropZone.addEventListener('dragenter', (e) = { e.preventDefault(); e.stopPropagation(); dragOverlay.classList.add('visible'); });
dragOverlay.addEventListener('dragleave', (e) = { e.preventDefault(); e.stopPropagation(); dragOverlay.classList.remove('visible'); });
dropZone.addEventListener('dragover', (e) = { e.preventDefault(); e.stopPropagation(); });
dropZone.addEventListener('drop', (e) = { e.preventDefault(); e.stopPropagation(); dragOverlay.classList.remove('visible'); handleFiles(e.dataTransfer.files); });

window.onload = () = {
document.getElementById('sort-select').onchange = (e) = handleSort(e);
document.getElementById('sort-select-mobile').onchange = (e) = handleSort(e);
document.getElementById('search-box').oninput = (e) = handleSearch(e.target.value);
document.getElementById('search-box-mobile').oninput = (e) = handleSearch(e.target.value);

if (!PASSWORD_ENABLED) {
 showDriveView();
 fetchFiles('');
} else {
 const savedPassword = localStorage.getItem('drive-password');
 if (savedPassword) {
     fetchFiles('').then(showDriveView).catch(() = {
         showLoginView(自动登录失败，请重新输入密码。);
     });
 } else {
     showLoginView();
 }
}
};
script
body
html
`;
}
