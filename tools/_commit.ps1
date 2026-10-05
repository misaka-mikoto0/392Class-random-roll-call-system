$env:GIT_SSH_COMMAND = 'ssh -o ProxyCommand=none'
$repo = 'd:/HugoMoveData/User/seewo/Documents/392Class-random-roll-call-system-main'
git -C $repo add -A
git -C $repo commit -m 'fix: Font Awesome 多 CDN 兜底加载，避免被客户端拦截导致图标失效'
git -C $repo push origin
