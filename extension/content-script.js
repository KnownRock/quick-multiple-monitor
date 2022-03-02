!(async () => {
  // https://developer.chrome.com/docs/extensions/mv3/content_scripts/

  const randomId = Math.floor(Math.random() * 1000000)
  // initialize float box div
  const continerDiv = initContainer(`__ext_qmm_div_${randomId}`)
  // initialize float box style
  initStyle(`__ext_qmm_style_${randomId}`, `__ext_qmm_div_${randomId}`)

  // when drag a url, show the div
  document.addEventListener('dragstart', async (e) => {
    if (isUrlDraged(e)) {
      setTimeout(async () => {
        await freshScreenDivs(continerDiv, {
          dragX: e.clientX,
          dragY: e.clientY,
        })
      }, 10)
    }
  })

  // after drag a url, hide the div
  document.addEventListener('dragend', (e) => {
    hideContainer()
  })

  // initialize float box content
  async function freshScreenDivs(div, { dragX, dragY }) {
    clearContainer()

    const { width, height } = await getUserSizeSetting()
    sizeContainer(width, height)

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

    moveContainer(divLeft, divTop)

    allScreens.forEach((screen, index) => {
      div.appendChild(getScreenBoxDiv(screen, index, allScreens.length, {
        minX, minY, scaleX, scaleY,
      }))
    })

    div.appendChild(getCloseBoxDiv())

    showContainer()
  }

  function getScreenBoxDiv(screen, index, length, {
    minX, minY, scaleX, scaleY,
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
      if (isUrlDraged(e)) {
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

      if (isUrlDraged(e)) {
        const url = e.dataTransfer.getData('text/uri-list')
        chrome.runtime.sendMessage({ func: 'open-new-tab', screenIndex: index, url })
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

  function initContainer(id) {
    const div = document.createElement('div')
    div.id = id
    document.body.appendChild(div)
    return div
  }

  function initStyle(id, divId) {
    const style = document.createElement('style')
    style.id = id
    style.innerHTML = `
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

  function moveContainer(x, y) {
    continerDiv.style.left = `${x}px`
    continerDiv.style.top = `${y}px`
  }

  function sizeContainer(width, height) {
    continerDiv.style.width = `${width}px`
    continerDiv.style.height = `${height}px`
  }

  function showContainer() {
    continerDiv.style.display = 'block'
  }

  function hideContainer() {
    continerDiv.style.display = 'none'
  }

  async function getUserSizeSetting() {
    // get the float box size
    return new Promise((resolve) => {
      chrome.storage.sync.get('size', (data) => {
        if (!data || !data.size) {
          resolve({
            width: 320,
            height: 180,
          })
        }
        resolve((data.size))
      })
    })
  }

  async function getAllScreens() {
    // get all screens info
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ func: 'get-all-screens' }, (response) => {
        resolve(response.screens)
      })
    })
  }

  function getAllScreensBound(allScreens, { height, width }) {
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

  async function getOpenerScreen(allScreens) {
    async function getOpenerScreenIndex() {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ func: 'get-screen-index' }, (response) => {
          resolve(response.screenIndex)
        })
      })
    }

    const openerScreenIndex = await getOpenerScreenIndex()

    return [allScreens[0], allScreens[openerScreenIndex]].reduce((acc, screen) => {
      if (screen) {
        return { ...screen }
      }
      return acc
    }, null)
  }

  function getContainerPosition({
    dragX, openerScreen, minX, scaleX, dragY, minY, scaleY, width, height,
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

  function isUrlDraged(e) {
    return e.dataTransfer.types.includes('text/uri-list')
  }
})()
