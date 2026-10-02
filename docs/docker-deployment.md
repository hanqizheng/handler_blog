# Docker 部署与 PM2 切换

这套配置部署 handler_blog 应用，继续使用现有 MySQL。GitHub Actions
在 push main / 手动触发后构建 Linux amd64 镜像，发布到 GHCR，再将同一镜像传到服务器。
服务器无需 npm/pnpm、GitHub PAT 或保存镜像仓库登录。

首次切换让旧 PM2 保持 8283，新 Docker 使用 127.0.0.1:8284，候选镜像检查使用
127.0.0.1:8285。确认新服务后再将现有 Nginx 转发改到 8284。
脚本不会停止 PM2、修改 Nginx、重建 MySQL 或删除数据库卷。

## 配置与后续部署

| 内容                                | 唯一来源                                                        | 如何生效           |
| ----------------------------------- | --------------------------------------------------------------- | ------------------ |
| 私密 AK/SK、数据库 URL、鉴权 secret | 服务器 `/opt/handler-blog/envs/app.env`                         | 更新后重新创建 app |
| 公开前端变量                        | 仓库 `deploy/build.env`；可由同名 GitHub Actions Variables 覆盖 | 新镜像构建时生效   |
| 生产应用 Compose                    | 仓库 `deploy/docker-compose.yml`                                | 发布同步到服务器   |
| 数据库数据和账号                    | 原有 MySQL                                                      | 本次容器化不修改   |

`deploy/build.env` 已填入本地生产配置中的公开域名、验证码场景/前缀、七牛域名和站点文案。
该文件只允许列出的九个 `NEXT_PUBLIC_*` 名称，拒绝数据库 URL 和私密密钥。
非空 GitHub Variables 覆盖文件值；要清空某项，直接修改该公开文件。

`.env`、`.env.*`、`.deploy.env*`、旧发布包、开发数据库 Compose、SSH key
和证据/编辑器目录不进入镜像构建上下文。构建使用虚拟 DB URL，页面在请求时访问数据库，
生产数据库不需要开放给 GitHub 构建。依赖采用 frozen lockfile 并禁用安装生命周期脚本。

运行时 Next.js 收到 Compose 注入的环境，因此不再需要将本地 `.env.production`
作为线上配置。生产 Compose 显式固定 NODE_ENV、HOSTNAME、NODE_OPTIONS 和 PORT，覆盖 env 文件中的对应项。
HOSTNAME 使用 localhost，配合 NODE_OPTIONS=--dns-result-order=ipv4first，实际监听仍为
127.0.0.1。这避开 Next.js 对 loopback 地址归一化不一致造成的 next-intl 重定向循环
（[Next.js issue #94745](https://github.com/vercel/next.js/issues/94745)）。
运行验证需在相同端口/监听环境下进行，不能仅用 Docker 端口映射代替生产 loopback 测试。
服务器脚本不会 `source` 环境文件，含 `$` 的 secret 不会被 shell 执行；但 Compose
仍有 dotenv 插值规则，值含 `$` 时应使用单引号字面值，例如 `AUTH_SECRET='含$的值'`。
不要把换行私钥放进 app.env，它由 GitHub SSH Secret 单独管理。

## 一、核实旧服务并准备服务器

以 ubuntu 用户登录服务器。先核实：

```bash
uname -m
pm2 list
blog_pid=$(pm2 pid handler_blog)
readlink -f "/proc/$blog_pid/cwd"
readlink -f /home/ubuntu/handler_blog/app/current
sudo ss -ltnp '( sport = :8283 or sport = :8284 or sport = :8285 )'
```

工作流当前构建 amd64，服务器应为 x86_64；若为 aarch64，先修改工作流平台。
确认旧服务端口与目录，8284/8285 无其他占用。生产 Compose 使用 Linux 主机网络，
这样数据库连接中的 127.0.0.1/localhost 继续指向服务器，不需要改数据库权限或开放数据库端口。

首次创建部署目录（仅对新 handler-blog 目录设置权限）：

```bash
sudo install -d -m 755 -o ubuntu -g ubuntu \
  /opt/handler-blog /opt/handler-blog/deploy /opt/handler-blog/scripts
sudo install -d -m 700 -o root -g root /opt/handler-blog/envs
```

从确认的旧服务发布目录复制配置，已有的新配置不会被覆盖：

```bash
blog_pid=$(pm2 pid handler_blog)
release_dir=$(readlink -f "/proc/$blog_pid/cwd")
test -f "$release_dir/.env.production"
if sudo test -e /opt/handler-blog/envs/app.env; then
  printf 'app.env 已存在，保留现有配置\n'
else
  sudo install -m 600 -o root -g root \
    "$release_dir/.env.production" /opt/handler-blog/envs/app.env
fi
sudo nano /opt/handler-blog/envs/app.env
```

复制前确认 `.env.production` 与实际进程配置相符；如另有进程注入值或优先 env 文件，
先核对后再建立 app.env。不要在聊天或 CI 日志中输出完整环境文件。

在新文件中替换已生成的 blog 阿里云密钥：

```dotenv
ALIYUN_CAPTCHA_ACCESS_KEY_ID=对应的新ID
ALIYUN_CAPTCHA_ACCESS_KEY_SECRET=对应的新Secret
```

保留匹配的场景 ID 与其他功能配置。`DATABASE_URL`、`ADMIN_AUTH_SECRET` 必填；
阿里云和七牛 AK/SK 配置时必须各自成对。此次先完成阿里云轮换，其他凭据另行处理。

## 二、配置 GitHub Actions

在 `hanqizheng/handler_blog` → Settings → Secrets and variables → Actions 添加：

| Secret               | 值                                                                    |
| -------------------- | --------------------------------------------------------------------- |
| `DEPLOY_HOST`        | `150.109.146.21`                                                      |
| `DEPLOY_USER`        | `ubuntu`                                                              |
| `DEPLOY_SSH_PORT`    | `22`，可省略                                                          |
| `DEPLOY_SSH_KEY`     | 已轮换的 CI 专用 SSH 私钥，公钥已加到服务器 ubuntu 的 authorized_keys |
| `DEPLOY_KNOWN_HOSTS` | 已核验的服务器 SSH known_hosts 条目                                   |

工作流使用 `production` GitHub Environment；如果该环境有部署审核，需要完成其审核。
`GITHUB_TOKEN` 由 Actions 自动提供，用于 GHCR，无需新建长期 PAT。
旧 `DATABASE_URL` 和 `VERCEL_DEPLOY_HOOK` Actions Secrets 已不被新工作流引用。
如果 Vercel 本身仍有 Git 自动部署集成，需在完成切换后单独关闭，不会因替换工作流自动关闭。

SSH 私钥生成与添加公钥必须在可信环境中完成，使用新的专用 key，不复用已泄露的旧 key。
无交互 CI 私钥不能需要手工输入口令；使用 GitHub Secret 保存，不放到仓库或镜像。
服务器的主机 key 指纹可以在当前已确认的 SSH 会话中查询：

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

核对从服务器取得的 known_hosts 条目对应此指纹；工作流不会自动接受陌生主机 key。
执行部署的 ubuntu 用户需要无交互 `sudo -n` 权限来运行 Docker 和部署脚本，
可在服务器验证 `sudo -n docker version >/dev/null`。

当前改动在本地工作分支，保存并合并到 main 后，push main 会自动部署。
首次也可以使用 GitHub Actions 的 Run workflow，并选择包含这些改动的已推送分支。
工作流构建门禁包括部署测试、ESLint、Next 生产构建和 TypeScript 检查。

## 三、首次 Docker 部署与域名切换

准备好服务器 app.env 和 GitHub Secrets 后，运行新工作流。自动执行：

1. 构建按完整 commit SHA 标记的镜像，发布到 GHCR。
2. 独立 deploy runner 按构建输出的 digest 拉取，传送准确镜像到服务器。
3. 同步 Compose 和部署脚本；不上传、不覆盖 app.env。
4. 获取服务器部署锁，检查端口与容器归属。
5. 8285 候选容器检查数据库与 `/zh-CN` 页面；成功后停止候选容器。
6. 重建 8284 的正式 app，再次检查；失败恢复旧 Docker 镜像。

新容器 `handler-blog-app` 首次启动成功后，在服务器检查：

```bash
sudo docker ps --filter name=handler-blog-app
curl --fail --max-time 10 http://127.0.0.1:8284/api/health
curl --fail --location --max-redirs 3 --max-time 10 -o /dev/null http://127.0.0.1:8284/zh-CN
```

健康接口确认 MySQL 可读 posts 表。首页检查会跟随默认语言的重定向，覆盖页面查询的多张业务表。
接着确认 `www.huteng.com` 的实际 Nginx 配置当前转发到旧 PM2，再在该配置内将
`proxy_pass http://127.0.0.1:8283;` 改成 `proxy_pass http://127.0.0.1:8284;`。
这是针对已确认 upstream 的修改，不对其他站点的配置做全局替换。

```bash
sudo nginx -t
sudo systemctl reload nginx
```

验证正式域名：中英文首页、文章、图片、后台登录、阿里云人机校验、七牛上传。
阿里云测试应完成需要服务端校验的真实业务动作，看到验证码组件不代表 AK/SK 生效。
确认新 AccessKey 被使用后，禁用旧 Key，再次测试成功，最后删除旧 Key。

业务验证稳定后再处理旧 PM2：

```bash
pm2 stop handler_blog
pm2 save
```

先保留旧代码和数据库数据用于回退。不要重新运行旧 `scripts/deploy.sh`，
它会再次携带旧本地 env 并启动 PM2。

## 四、以后更新密钥

只修改 `/opt/handler-blog/envs/app.env`，然后使用当前镜像重新创建应用：

```bash
blog_image=$(sudo docker inspect --format '{{.Config.Image}}' handler-blog-app)
sudo env HANDLER_BLOG_IMAGE="$blog_image" \
  docker compose --project-name handler-blog \
  -f /opt/handler-blog/deploy/docker-compose.yml \
  --env-file /opt/handler-blog/envs/app.env \
  up -d --no-deps --force-recreate --pull never app
```

检查健康和对应业务，再吊销旧凭据。此处不跑构建或数据库迁移。
普通 Docker restart 不会重新注入环境文件；后续自动发布和 Docker 镜像回退都保留服务器新配置。
本地开发若继续使用同一账号，需要更新或移除本地旧凭据；Docker 发布不再依赖该本地副本。

## 五、数据库迁移

默认 `RUN_DB_MIGRATIONS=0`，首次容器化和密钥轮换不改生产 schema。
当提交包含新增迁移时，先核对旧数据库的 Drizzle 迁移记录与当前 journal；
旧表已存在但没有迁移记录时，不能直接重新执行初始化 SQL，需要核实基线。
不通过删除数据卷来解决历史 schema 差异。

准备并验证可恢复的近期备份后，在 GitHub Actions Variables 中设置：

```text
RUN_DB_MIGRATIONS=1
MIGRATION_BACKUP_FILE=/服务器上已验证的备份绝对路径.sql
```

工作流验证路径格式，服务器验证备份文件非空，但这不能自动证明备份有效或完整。
迁移在新镜像的一次性容器中，用当前 app.env 和单一 MySQL 连接执行 Drizzle migrate。
迁移失败不会替换现有应用；已执行的 MySQL DDL 不一定能够回滚。
自动回退只恢复应用镜像，不撤销数据库变更，新旧镜像需要兼容迁移后的 schema。
完成这一轮 schema 更新后将开关恢复为 0，避免普通密钥更新意外触发迁移。

## 六、回退

首次切换期间如新 Docker 业务检查失败，保持/重新启动 PM2，并将已确认的 Nginx
upstream 改回 8283。注意旧 PM2 可能持有旧 AccessKey；禁用旧 key 后，PM2 回退也必须
载入新凭据才能恢复相关功能，不可重新启用泄露的旧 key。

后续 Docker 自动部署在替换失败时，使用旧容器的镜像 ID 建立本地 rollback 标签，
因此不依赖可变的 latest 标签，也不恢复旧 env。候选验证失败时原容器保持运行。

手工恢复记录的前一镜像（只接受自动部署生成的 rollback 标签）：

```bash
previous_image=$(sudo cat /opt/handler-blog/.previous_image)
if [[ "$previous_image" =~ ^handler-blog-rollback:[a-f0-9]{64}$ ]]; then
  sudo env HANDLER_BLOG_IMAGE="$previous_image" \
    docker compose --project-name handler-blog \
    -f /opt/handler-blog/deploy/docker-compose.yml \
    --env-file /opt/handler-blog/envs/app.env \
    up -d --no-deps --force-recreate --pull never app
fi
```

恢复后重新检查健康和业务。部署不自动清理镜像/回退标签/数据库快照，避免误删恢复所需内容；
后续可制定独立保留策略。首次部署没有旧 Docker 镜像时，失败只移除新应用容器，PM2 保持原状。

## 验证命令

```bash
python3 -I -S -m unittest discover -s tests/deployment -v
bash -n scripts/server/deploy-on-server.sh
node --check scripts/check-runtime-env.mjs
node --check scripts/migrate.mjs
```

部署测试覆盖候选失败、正式替换失败、命令失败、首次失败、端口占用、并发、
迁移失败、容器归属、public/private 配置隔离，并验证 env 文件不会被 shell 执行或改写。
真实服务器 Nginx、既有数据库 schema、AccessKey 权限仍需首次上线时验证。
