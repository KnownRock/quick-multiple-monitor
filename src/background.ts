let xOffset = 0
let yOffset = 0

if (navigator.userAgentData.platform === 'Windows') {
  xOffset = 8
  yOffset = 8
}

async function main() {
  chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
      if (request.func === 'get-all-screens') {
        (async () => {
          const allScreens = await getAllScreens()
          sendResponse({ screens: allScreens })
        })()
      } else if (request.func === 'open-new-tab') {
        const { screenIndex } = request
        const { url } = request;
        (async () => {
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
        (async () => {
          const allScreens = await getAllScreens()
          const windows = await getAllWindows()

          const window = windows.find((w) => sender.tab && w.id === sender.tab.windowId)
          if (window && window.left !== undefined && window.top !== undefined) {
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

async function getSystemDisplayInfo(): Promise<chrome.system.display.DisplayInfo[]> {
  return new Promise((resolve) => {
    chrome.system.display.getInfo(resolve)
  })
}

async function getAllScreens(): Promise<SimpleScreen[]> {
  return getSystemDisplayInfo()
    .then((systemDisplayInfo) => systemDisplayInfo.map((displayInfo) => ({
      x: displayInfo.bounds.left,
      y: displayInfo.bounds.top,
      width: displayInfo.bounds.width,
      height: displayInfo.bounds.height,
    })))
}

function getScreenIndex(allScreens: SimpleScreen[], { x, y }: SimpleScreenCoord) {
  return allScreens.reduce((acc, screen, index) => {
    if (x >= screen.x && x < screen.x + screen.width
      && y >= screen.y && y < screen.y + screen.height) {
      return index
    }
    return acc
  }, -1)
}

async function getAllWindows(): Promise<chrome.windows.Window[]> {
  return new Promise((resolve) => {
    chrome.windows.getAll(resolve)
  })
}

// https://developer.chrome.com/docs/extensions/reference/windows/#method-update
async function getMaximizedWindow({
  x, y, width, height,
}: SimpleScreen) {
  const windows = await getAllWindows()
  const maximizedWindows = windows
    .filter((w) => w.state === 'maximized')
    .filter((w) => {
      if (w.top === undefined || w.left === undefined) return false
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

async function createWindow({ x, y, url }:CreateScreenInfo) : Promise<chrome.windows.Window> {
  return new Promise((resolve, reject) => {
    chrome.windows.create(
      {
        focused: false,
        left: x - xOffset,
        top: y - yOffset,
        url,
      },
      (window) => {
        if (window) {
          resolve(window)
        } else {
          reject(new Error('Failed to create window'))
        }
      },
    )
  })
}

async function maximizeWindow(windowId:number) : Promise<chrome.windows.Window> {
  return new Promise((resolve) => {
    chrome.windows.update(windowId, { state: 'maximized' }, resolve)
  })
}

async function createMaximizedWindow({ x, y, url }: CreateScreenInfo) {
  const window = await createWindow({ x, y, url })
  maximizeWindow(window.id)
  return window
}

// https://developer.chrome.com/docs/extensions/reference/tabs/#method-create
async function createTab(windowId:number, url:string) : Promise<chrome.tabs.Tab> {
  return new Promise((resolve) => {
    chrome.tabs.create({ windowId, url, active: true }, resolve)
  })
}

main()
