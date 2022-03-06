(async () => {
  // https://developer.chrome.com/docs/extensions/mv3/content_scripts/

  const randomId = Math.floor(Math.random() * 1000000)
  // initialize float box div
  const continerDiv = initContainer(`__ext_qmm_div_${randomId}`)

  const centerDiv = initCenterDiv(`__ext_qmm_center_div_${randomId}`)

  const hoverDiv = document.createElement('div')
  hoverDiv.className = 'hover-div hide'
  hoverDiv.draggable = true
  centerDiv.appendChild(hoverDiv)

  // initialize float box style
  initStyle(`__ext_qmm_style_${randomId}`, `__ext_qmm_div_${randomId}`, `__ext_qmm_center_div_${randomId}`)

  // when drag a url, show the div
  document.addEventListener('dragstart', async (e) => {
    if (isVaildDraged(e)) {
      setTimeout(async () => {
        await freshScreenDivs(continerDiv, {
          dragX: e.clientX,
          dragY: e.clientY,
        })
      }, 10)
    }
  })

  // after drag a url, hide the div
  document.addEventListener('dragend', () => {
    hideContainer()
  })

  document.addEventListener('mousemove', async (e) => {
    const x = e.clientX
    const y = e.clientY

    const windowWidth = (window.innerWidth)
    const windowHeight = (window.innerHeight)

    const centerPoint = { x: windowWidth / 2, y: windowHeight / 2 }

    if ((centerPoint.x - x) ** 2 + (centerPoint.y - y) ** 2 < 2500) {
      hoverDiv.classList.remove('hide')
      hoverDiv.classList.add('show')
    } else {
      hoverDiv.classList.remove('show')
      hoverDiv.classList.add('hide')
    }
  })

  hoverDiv.addEventListener('dragstart', async (e) => {
    if (e.dataTransfer) e.dataTransfer.setData('text/uri-list', 'qmm://move-window')
    // e.dataTransfer.effectAllowed = 'move'
  })

  // initialize float box content
  async function freshScreenDivs(
    div: HTMLElement,
    { dragX, dragY }: { dragX: number, dragY: number },
  ) {
    clearContainer()

    const { width, height } = await getUserSetting()
    sizeContainer({ width, height })

    const allScreens = await getAllScreens()

    const {
      minX, minY, scaleX, scaleY,
    } = getAllScreensBound(allScreens, { height, width })

    const openerScreen = await getOpenerScreen(allScreens)

    if (!openerScreen) {
      return
    }

    const { divLeft, divTop } = getContainerPosition({
      dragX, openerScreen, minX, scaleX, dragY, minY, scaleY, width, height,
    })

    moveContainer({ x: divLeft, y: divTop })

    allScreens.forEach((screen, index) => {
      div.appendChild(getScreenBoxDiv(screen, index, allScreens.length, {
        minX, minY, scaleX, scaleY,
      }))
    })

    div.appendChild(getCloseBoxDiv())

    showContainer()
  }

  function getScreenBoxDiv(screen: SimpleScreen, index: number, length: number, {
    minX, minY, scaleX, scaleY,
  }: {
    minX: number, minY: number, scaleX: number, scaleY: number,
  }) {
    const sDiv = document.createElement('div')
    sDiv.className = 'screen-div'
    sDiv.style.position = 'absolute'
    sDiv.style.top = `${(screen.y - minY) * scaleY}px`
    sDiv.style.left = `${(screen.x - minX) * scaleX}px`
    sDiv.style.width = `${screen.width * scaleX}px`
    sDiv.style.height = `${screen.height * scaleY}px`
    // by github copilot
    sDiv.style.backgroundColor = `hsl(${(index * 360) / length}, 100%, 50%)`
    sDiv.innerHTML = `
        <div class="screen-index-label">${index}</div>
      `

    sDiv.addEventListener('dragover', (e) => {
      if (isVaildDraged(e)) {
        // add hover effect when dragging over
        sDiv.classList.add('screen-div-hover')

        e.preventDefault()
        e.stopPropagation()
      }
    })

    sDiv.addEventListener('dragleave', (e) => {
      // remove hover effect when dragging out
      sDiv.classList.remove('screen-div-hover')

      e.preventDefault()
      e.stopPropagation()
    })

    sDiv.addEventListener('drop', (e) => {
      e.preventDefault()
      e.stopPropagation()

      hideContainer()

      if (isVaildDraged(e)) {
        if (e.dataTransfer && e.dataTransfer.types.includes('text/uri-list')) {
          const url = e.dataTransfer && e.dataTransfer.getData('text/uri-list')
          const qmmUrl = url.match(/(?<=^qmm:\/\/)(.*)/)
          if (qmmUrl) {
            const qmmUrlStr = qmmUrl[0]
            if (qmmUrlStr === 'move-window') {
              chrome.runtime.sendMessage({ func: 'move-window', screenIndex: index })
            }
          } else {
            chrome.runtime.sendMessage({ func: 'open-new-tab', screenIndex: index, url })
          }
        } else if (e.dataTransfer && e.dataTransfer.getData('text/plain')) {
          const text = e.dataTransfer && e.dataTransfer.getData('text/plain')
          chrome.runtime.sendMessage({
            func: 'open-new-tab',
            screenIndex: index,
            url: `https://www.google.com/search?q=${text}`,
          })
        }
      }
    })
    return sDiv
  }

  function getCloseBoxDiv() {
    const closeDiv = document.createElement('div')
    closeDiv.className = 'close-div'
    closeDiv.innerHTML = '<div>X</div>'

    closeDiv.addEventListener('click', (e) => {
      hideContainer()
      e.preventDefault()
      e.stopPropagation()
    })

    closeDiv.addEventListener('dragover', (e) => {
      hideContainer()
      e.preventDefault()
      e.stopPropagation()
    })
    return closeDiv
  }

  function initContainer(id: string) {
    const div = document.createElement('div')
    div.id = id
    document.body.appendChild(div)
    return div
  }

  function initCenterDiv(id: string) {
    const div = document.createElement('div')
    div.id = id
    document.body.appendChild(div)

    return div
  }

  function initStyle(id: string, divId: string, centerDivId: string) {
    const style = document.createElement('style')
    style.id = id
    style.innerHTML = `
    #${centerDivId} {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999999;

      display: flex;
      justify-content: center;
      align-items: center;
    }

    #${centerDivId} .hover-div {
      border-radius: 50%;
      pointer-events: auto;
      background-color: rgba(0, 0, 0, 0.5);
      cursor: pointer;


      transition: all 0.4s ease-in-out !important;
    }

    #${centerDivId} .hide {
      opacity: 0;
      width: 0px;
      height: 0px;
      visibility: hidden;
    }

    #${centerDivId} .show {
      opacity: 1;
      height: 100px;
      width: 100px;
      visibility: visible;
    }





    #${divId} {
      display: none;
      pointer-events: auto;
      z-index: 99999999;
      top: 0;
      left: 0;
      position: fixed;
    }
    #${divId} .screen-div {
      position: absolute;
      z-index: 1;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;

      transition: all 0.3s ease-in-out;
    }
    #${divId} .screen-div .screen-index-label {
      margin:0; 
      font-size:20px;font-family: 'Courier New', monospace
    }
    #${divId} .screen-div-hover {
      filter: brightness(0.7);
    }


    #${divId} .close-div {
      position: absolute;
      z-index: 2;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.5;

      top: 0px;
      right: 0px;
      width: 20px;
      height: 20px;
      background-color: lightgray;
      
    }

    #${divId} .close-div:hover {
      background-color: gray;
    }
  `
    document.body.appendChild(style)
  }

  function clearContainer() {
    continerDiv.innerHTML = ''
  }

  function moveContainer({ x, y }: Coord) {
    continerDiv.style.left = `${x}px`
    continerDiv.style.top = `${y}px`
  }

  function sizeContainer({ width, height }: Size) {
    continerDiv.style.width = `${width}px`
    continerDiv.style.height = `${height}px`
  }

  function showContainer() {
    continerDiv.style.display = 'block'
  }

  function hideContainer() {
    continerDiv.style.display = 'none'
  }

  async function getUserSetting(): Promise<Size> {
    // get the float box size
    return new Promise((resolve) => {
      chrome.storage.sync.get('setting', (data) => {
        if (!data || !data.setting) {
          resolve({
            width: 320,
            height: 180,
          })
        }
        resolve((data.setting))
      })
    })
  }

  async function getAllScreens(): Promise<SimpleScreen[]> {
    // get all screens info
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ func: 'get-all-screens' }, (response) => {
        resolve(response.screens)
      })
    })
  }

  function getAllScreensBound(allScreens: SimpleScreen[], { height, width }: Size) {
    // resize screen divs size to fit float box
    const {
      minX, maxX, minY, maxY,
    } = allScreens.reduce((acc, screen) => {
      acc.minX = Math.min(acc.minX, screen.x)
      acc.maxX = Math.max(acc.maxX, screen.x + screen.width)
      acc.minY = Math.min(acc.minY, screen.y)
      acc.maxY = Math.max(acc.maxY, screen.y + screen.height)
      return acc
    }, {
      minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity,
    })

    const scaleX = width / (maxX - minX)
    const scaleY = height / (maxY - minY)

    return {
      minX,
      // maxX,
      minY,
      // maxY,
      scaleX,
      scaleY,
    }
  }

  async function getOpenerScreen(allScreens: SimpleScreen[]) {
    async function getOpenerScreenIndex(): Promise<number> {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ func: 'get-screen-index' }, (response) => {
          resolve(response.screenIndex)
        })
      })
    }

    const openerScreenIndex = await getOpenerScreenIndex()
    return ([allScreens[0], allScreens[openerScreenIndex]] as (SimpleScreen | null)[])
      .reduce((acc, screen) => {
        if (screen) {
          return { ...screen }
        }
        return acc
      }, null)
  }

  function getContainerPosition({
    dragX, openerScreen, minX, scaleX, dragY, minY, scaleY, width, height,
  }: {
    dragX: number,
    openerScreen: SimpleScreen,
    minX: number,
    scaleX: number,
    dragY: number,
    minY: number,
    scaleY: number,
    width: number,
    height: number
  }) {
    let divLeft = dragX - (openerScreen.x + openerScreen.width / 2 - minX) * scaleX
    let divTop = dragY - (openerScreen.y + openerScreen.height / 2 - minY) * scaleY

    if (divLeft < 0) {
      divLeft = 0
    }
    if (divTop < 0) {
      divTop = 0
    }
    if (divLeft > (document.body.clientWidth || window.screen.availWidth) - width) {
      divLeft = (document.body.clientWidth || window.screen.availWidth) - width
    }
    if (divTop > (document.body.clientHeight || window.screen.availHeight) - height) {
      divTop = (document.body.clientHeight || window.screen.availHeight) - height
    }
    return { divLeft, divTop }
  }

  function isVaildDraged(e: DragEvent) {
    if (!e.dataTransfer) return false
    return e.dataTransfer.types.includes('text/uri-list') || e.dataTransfer.types.includes('text/plain')
  }
})()
