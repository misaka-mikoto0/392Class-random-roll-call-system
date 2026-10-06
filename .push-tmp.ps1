$env:GIT_SSH_COMMAND = 'ssh -4 -o ProxyCommand=none'
$repo = 'd:/HugoMoveData/User/seewo/Documents/392Class-random-roll-call-system-main'
git -C $repo add -A
git -C $repo commit -m 'feat: 本地兜底图标改用 YesIcon（Iconify/Lucide），移除 emoji 字形与自托管 Font Awesome'
git -C $repo push origin
