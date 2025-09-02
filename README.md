##simpleR2drive
-*变量*
-*PASSWORD*:'登录密码'
-*MY_DRIVE_BUCKET*:'绑定R2'
# Linklet Worker: 一个基于 Cloudflare 的极简短链接服务

这是一个部署在 Cloudflare Workers 上的轻量级、无服务器的短链接应用。它使用 Cloudflare D1 作为数据库，并提供一个简单的管理后台。

## ✨ 功能特性

- **无服务器**: 无需管理虚拟机或容器，完全由 Cloudflare 驱动。
- **快速响应**: 全球边缘节点部署，为用户提供极速的创建和重定向体验。
- **持久化存储**: 使用 Cloudflare D1 (SQLite) 数据库存储所有链接。
- **管理员后台**: 提供一个位于 `/admin` 的安全后台，用于查看、修改和删除所有链接。
- **极简配置**: 所有配置均通过 Cloudflare 控制台的环境变量完成，无需修改代码。

---

## 🚀 部署流程 (Deployment Workflow)

整个部署流程完全在 Cloudflare 的网页控制台中完成，无需任何本地开发工具。

### 第一步：配置 Cloudflare D1 数据库

1.  **创建数据库**:
    - 登录 Cloudflare 控制台，导航至 `Workers & Pages` -> `D1`。
    - 点击 **Create database**，并为它命名（例如 `linklet-db`）。

2.  **创建数据表 (Schema)**:
    - 进入刚创建的 `linklet-db` 数据库。
    - 在 **Console** 标签页中，粘贴并运行以下 SQL 命令来创建 `links` 表：

    ```sql
    CREATE TABLE links (
      slug TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ```

### 第二步：创建并配置 Worker

1.  **创建 Worker**:
    - 导航至 `Workers & Pages`，点击 **Create application**。
    - 选择 **Create Worker**，为你的 Worker 命名（例如 `my-link-worker`），然后点击 **Deploy**。

2.  **配置环境变量**:
    - 进入你刚创建的 Worker，点击 `Settings` -> `Variables`。
    - **绑定 D1 数据库**:
        - 在 `D1 Database Bindings` 部分，点击 **Add binding**。
        - **Variable name**: `DB`
        - **D1 database**: 选择你刚刚创建的 `linklet-db`。
    - **设置管理员密码**:
        - 在 `Environment Variables` 部分，点击 **Add variable**。
        - **Variable name**: `ADMIN_PASSWORD`
        - **Value**: `输入一个你自己设置的安全密码`
        - *（推荐）点击旁边的锁形图标加密此变量。*
    - **设置 JWT 密钥**:
        - 再次点击 **Add variable**。
        - **Variable name**: `JWT_SECRET`
        - **Value**: `输入一个长而随机的字符串作为签名密钥`

### 第三步：部署 Worker 代码

1.  **粘贴代码**:
    - 进入 Worker 的 **Code** 标签页。
    - 删除编辑器中所有的默认代码。
    - 将项目提供的 `worker.js` 文件的全部内容复制并粘贴到编辑器中。

2.  **保存并部署**:
    - 点击 **Save and Deploy** 按钮。

🎉 恭喜你！你的短链接服务现在已经成功部署并可以访问了。

---

## 🛠️ 如何使用

- **公共主页**: 访问你的 Worker URL (例如 `https://my-link-worker.your-subdomain.workers.dev` ) 即可看到创建短链接的公共页面。
- **管理员后台**: 访问 `[你的 Worker URL]/admin` (例如 `https://my-link-worker.your-subdomain.workers.dev/admin` )。
- **登录**: 在后台页面输入你在环境变量 `ADMIN_PASSWORD` 中设置的密码进行登录。
- **管理**: 登录后，你可以查看所有已创建的短链接，并进行修改或删除操作。

