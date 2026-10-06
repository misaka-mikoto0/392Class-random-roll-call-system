$env:GIT_SSH_COMMAND = 'ssh -4 -o ProxyCommand=none'
$repo = 'd:/HugoMoveData/User/seewo/Documents/392Class-random-roll-call-system-main'
git -C $repo rm --cached .push-tmp.ps1
git -C $repo commit -m 'chore: 移除误提交的临时脚本' -- .push-tmp.ps1
git -C $repo push origin
