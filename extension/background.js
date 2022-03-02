let xOffset = 0
let yOffset = 0

if (navigator.userAgentData.platform === 'Windows') {
  xOffset = 8
  yOffset = 8
}

async function getSystemDisplayInfo() {
  return new Promise((resolve) => {
    chrome.system.display.getInfo(resolve)
  })
}

async function getAllScreens() {
  return getSystemDisplayInfo()
    .then((systemDisplayInfo) => systemDisplayInfo.map((displayInfo) => ({
      x: displayInfo.bounds.left,
      y: displayInfo.bounds.top,
      width: displayInfo.bounds.width,
      height: displayInfo.bounds.height,
    })))
}

function getScreenIndex(allScreens, { x, y }) {
  return allScreens.reduce((acc, screen, index) => {
    if (x >= screen.x && x < screen.x + screen.width
      && y >= screen.y && y < screen.y + screen.height) {
      return index
    }
    return acc
  }, -1)
}

async function getAllWindows() {
  return new Promise((resolve) => {
    chrome.windows.getAll({ populate: true }, resolve)
  })
}

// https://developer.chrome.com/docs/extensions/reference/windows/#method-update
async function getMaximizedWindow({
  x, y, width, height,
}) {
  const windows = await getAllWindows()
  const maximizedWindows = windows
    .filter((w) => w.state === 'maximized')
    .filter((w) => {
      const newTop = w.top + yOffset
      const newLeft = w.left + xOffset

      return newTop >= y && newLeft >= x && newTop < y + height && newLeft < x + width
    })
  if (maximizedWindows.length > 0) {
    const activeWindow = maximizedWindows.find((w) => w.focused)
    return activeWindow || maximizedWindows[0]
  }
  return null
}

async function createWindow({ x, y, url }) {
  return new Promise((resolve) => {
    chrome.windows.create(
      {
        focused: false,
        left: x - xOffset,
        top: y - yOffset,
        url,
      },
      (window) => {
        resolve(window)
      },
    )
  })
}

async function maximizeWindow(windowId) {
  return new Promise((resolve) => {
    chrome.windows.update(windowId, { state: 'maximized' }, resolve)
  })
}

async function createMaximizedWindow({ x, y, url }) {
  const window = await createWindow({ x, y, url })
  maximizeWindow(window.id)
  return window
}

// https://developer.chrome.com/docs/extensions/reference/tabs/#method-create
async function createTab(windowId, url) {
  return new Promise((resolve) => {
    chrome.tabs.create({ windowId, url, active: true }, resolve)
  })
}

async function main() {
  chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
      if (request.func === 'get-all-screens') {
        !(async () => {
          const allScreens = await getAllScreens()
          sendResponse({ screens: allScreens })
        })()
      } else if (request.func === 'open-new-tab') {
        const { screenIndex } = request
        const { url } = request
        !(async () => {
          const allScreens = await getAllScreens()
          let window = await getMaximizedWindow(allScreens[screenIndex])
          if (window) {
            await createTab(window.id, url)
          } else {
            window = await createMaximizedWindow({
              ...allScreens[screenIndex],
              url,
            })
          }
        })()
      } else if (request.func === 'get-screen-index') {
        !(async () => {
          const allScreens = await getAllScreens()
          const windows = await getAllWindows()
          const window = windows.find((w) => w.id === sender.tab.windowId)
          if (window) {
            const screenIndex = getScreenIndex(allScreens, {
              x: window.left + xOffset,
              y: window.top + yOffset,
            })
            sendResponse({ screenIndex })
          } else {
            sendResponse({ screenIndex: -1 })
          }
        })()
      }

      return true
    },
  )
}

main()
