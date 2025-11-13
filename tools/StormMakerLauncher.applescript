use AppleScript version "2.8"
use scripting additions

property fixedPort : "5173"
property pidRelativePath : "tools/server.pid"

on run
  set repoPath to resolveRepoPath()
  if repoPath is "" then
    display dialog "Unable to locate project root (package.json not found)." buttons {"OK"} default button 1
    return
  end if

  set pidFile to repoPath & "/" & pidRelativePath
  set targetURL to "http://localhost:" & fixedPort & "/"

  cleanExistingServer(pidFile)
  set serverPID to launchServer(repoPath, pidFile)
  if serverPID is "" then
    display dialog "Failed to start npm dev server." buttons {"OK"} default button 1
    return
  end if

  if not waitForServer(targetURL) then
    stopServer(serverPID, pidFile)
    display dialog "Server did not respond at " & targetURL buttons {"OK"} default button 1
    return
  end if

  set browserChoice to openChromeThenSafari(targetURL)
  if browserChoice is "" then
    stopServer(serverPID, pidFile)
    display dialog "Neither Google Chrome nor Safari is available." buttons {"OK"} default button 1
    return
  end if

  monitorBrowser(browserChoice, targetURL)
  stopServer(serverPID, pidFile)
end run

on resolveRepoPath()
  try
    set scriptPath to POSIX path of (path to me)
  on error
    set scriptPath to (do shell script "pwd")
  end try
  set resolveCommand to "DIR=" & quoted form of scriptPath & "; if [ -f \"$DIR\" ]; then DIR=$(dirname \"$DIR\"); fi; while [ \"$DIR\" != \"/\" ] && [ ! -f \"$DIR/package.json\" ]; do DIR=$(dirname \"$DIR\"); done; if [ -f \"$DIR/package.json\" ]; then cd \"$DIR\" && pwd; else echo \"\"; fi"
  return do shell script resolveCommand
end resolveRepoPath

on cleanExistingServer(pidFile)
  try
    set existingPID to do shell script "if [ -f " & quoted form of pidFile & " ]; then cat " & quoted form of pidFile & "; fi"
  on error
    set existingPID to ""
  end try
  if existingPID is not "" then
    do shell script "if ps -p " & existingPID & " >/dev/null 2>&1; then kill " & existingPID & " >/dev/null 2>&1 || true; sleep 1; if ps -p " & existingPID & " >/dev/null 2>&1; then kill -9 " & existingPID & " >/dev/null 2>&1 || true; fi; fi"
  end if
  try
    do shell script "rm -f " & quoted form of pidFile
  end try
end cleanExistingServer

on launchServer(repoPath, pidFile)
  set launchCommand to "cd " & quoted form of repoPath & " && PORT=" & fixedPort & " npm run dev -- --host 0.0.0.0 --port " & fixedPort & " >/tmp/stormmaker-launcher.log 2>&1 & echo $!"
  try
    set serverPID to do shell script launchCommand
    do shell script "echo " & serverPID & " > " & quoted form of pidFile
    return serverPID
  on error
    return ""
  end try
end launchServer

on waitForServer(targetURL)
  repeat with attempt from 1 to 60
    try
      do shell script "curl -s --max-time 2 " & quoted form of targetURL & " >/dev/null"
      return true
    on error
      delay 1
    end try
  end repeat
  return false
end waitForServer

on openChromeThenSafari(targetURL)
  try
    tell application "Google Chrome"
      activate
      if (count of windows) = 0 then make new window
      tell window 1 to make new tab with properties {URL:targetURL}
    end tell
    return "Chrome"
  on error
    try
      tell application "Safari"
        activate
        if (count of windows) = 0 then
          make new document with properties {URL:targetURL}
        else
          tell window 1 to set current tab to (make new tab with properties {URL:targetURL})
        end if
      end tell
      return "Safari"
    on error
      return ""
    end try
  end try
end openChromeThenSafari

on monitorBrowser(browserChoice, targetURL)
  repeat
    delay 2
    set stillOpen to false
    if browserChoice is "Chrome" then
      set stillOpen to chromeHasTarget(targetURL)
    else if browserChoice is "Safari" then
      set stillOpen to safariHasTarget(targetURL)
    end if
    if not stillOpen then exit repeat
  end repeat
end monitorBrowser

on chromeHasTarget(targetURL)
  try
    tell application "Google Chrome"
      repeat with aWindow in every window
        repeat with aTab in tabs of aWindow
          if my urlsMatch((URL of aTab), targetURL) then return true
        end repeat
      end repeat
    end tell
  on error
    return false
  end try
  return false
end chromeHasTarget

on safariHasTarget(targetURL)
  try
    tell application "Safari"
      repeat with aWindow in every window
        repeat with aTab in tabs of aWindow
          if my urlsMatch((URL of aTab), targetURL) then return true
        end repeat
      end repeat
    end tell
  on error
    return false
  end try
  return false
end safariHasTarget

on urlsMatch(currentURL, targetURL)
  if currentURL is missing value then return false
  set trimmedTarget to targetURL
  if targetURL ends with "/" then set trimmedTarget to text 1 thru -2 of targetURL
  if currentURL begins with targetURL then return true
  if currentURL begins with trimmedTarget then return true
  return false
end urlsMatch

on stopServer(serverPID, pidFile)
  if serverPID is "" then return
  try
    do shell script "if ps -p " & serverPID & " >/dev/null 2>&1; then kill " & serverPID & " >/dev/null 2>&1 || true; fi"
  end try
  set stillAlive to true
  repeat with attempt from 1 to 5
    delay 1
    try
      do shell script "ps -p " & serverPID & " >/dev/null 2>&1"
      set stillAlive to true
    on error
      set stillAlive to false
      exit repeat
    end try
  end repeat
  if stillAlive then
    try
      do shell script "kill -9 " & serverPID & " >/dev/null 2>&1 || true"
    end try
  end if
  try
    do shell script "rm -f " & quoted form of pidFile
  end try
end stopServer
