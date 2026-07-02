#!/bin/bash
# Dayboard wall-display kiosk launcher.
#
# Opens the display app fullscreen in Google Chrome on the Mini's attached screen.
# Run at login by com.dayboard.kiosk.plist (a LaunchAgent), which supervises this process
# and relaunches it if it exits.
#
# --autoplay-policy is required: the reminder takeover plays a chime via the Web Audio API
# and needs autoplay allowed without a user gesture.
#
# A dedicated user-data-dir keeps this separate from your normal Chrome profile and avoids
# the "restore pages?" bubble after a reboot.

set -u

DISPLAY_URL="${DAYBOARD_DISPLAY_URL:-http://localhost:4173}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE="$HOME/.dayboard-kiosk-profile"

# Wait until the display is actually being served (containers may still be starting at
# login) so Chrome doesn't open on an error page.
until curl -sf -o /dev/null "$DISPLAY_URL"; do
  sleep 2
done

exec "$CHROME" \
  --kiosk \
  --app="$DISPLAY_URL" \
  --user-data-dir="$PROFILE" \
  --autoplay-policy=no-user-gesture-required \
  --noerrdialogs \
  --disable-session-crashed-bubble \
  --disable-infobars \
  --overscroll-history-navigation=0 \
  --check-for-update-interval=31536000
