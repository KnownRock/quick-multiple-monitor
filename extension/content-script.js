!(async () => {
  // https://developer.chrome.com/docs/extensions/mv3/content_scripts/

  // initialize float box div
  const div = document.createElement('div');
  const randomId = Math.floor(Math.random() * 1000000)
  const divId = '__ext_qmm_div_' + randomId
  div.id = divId;
  document.body.appendChild(div);

  // initialize float box style
  const style = document.createElement('style');
  style.id = '__ext_qmm_style_' + randomId
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

      top: 0px;
      right: 0px;
      width: 20px;
      height: 20px;
      background-color: lightgray;
      border-radius: 50%;
    }

    #${divId} .close-div:hover {
      background-color: gray;
    }
  `
  document.body.appendChild(style);

  // initialize float box content
  async function freshScreenDivs(div, { dragX, dragY }) {
    div.innerHTML = '';

    // get the float box size
    const { width, height } = await new Promise((resolve, reject) => {
      chrome.storage.sync.get('size', function (data) {
        if (!data || !data.size) {
          resolve({
            width: 320,
            height: 180
          });
        }
        resolve((data.size));
      })
    })
    div.style.width = `${width}px`;
    div.style.height = `${height}px`;

    // get all screens info
    const allScreens = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ func: 'get-all-screens', }, function (response) {
        resolve(response.screens);
      });
    })

    // resize screen divs size to fit float box
    const { minX, maxX, minY, maxY } = allScreens.reduce((acc, screen) => {
      acc.minX = Math.min(acc.minX, screen.x);
      acc.maxX = Math.max(acc.maxX, screen.x + screen.width);
      acc.minY = Math.min(acc.minY, screen.y);
      acc.maxY = Math.max(acc.maxY, screen.y + screen.height);
      return acc;
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });


    const scaleX = width / (maxX - minX);
    const scaleY = height / (maxY - minY);


    // get opener from which screen
    const openerScreenIndex = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ func: 'get-screen-index' }, function (response) {
        resolve(response.screenIndex)
      })
    })

    const openerScreen = [allScreens[0], allScreens[openerScreenIndex]].reduce((acc, screen) => {
      if (screen) {
        acc = { ...screen };
      }
      return acc;
    }, null);

    if (!openerScreen) {
      console.log('no opener screen');
      return;
    }

    div.style.display = 'block';

    div.style.left = dragX - (openerScreen.x + openerScreen.width / 2 - minX) * scaleX + 'px';
    div.style.top = dragY - (openerScreen.y + openerScreen.height / 2 - minY) * scaleY + 'px';

    allScreens.forEach((screen, index) => {
      const sDiv = document.createElement('div');
      sDiv.className = 'screen-div';
      sDiv.style.position = 'absolute';
      sDiv.style.top = `${(screen.y - minY) * scaleY}px`;
      sDiv.style.left = `${(screen.x - minX) * scaleX}px`;
      sDiv.style.width = `${screen.width * scaleX}px`;
      sDiv.style.height = `${screen.height * scaleY}px`;
      // by github copilot
      sDiv.style.backgroundColor = `hsl(${index * 360 / allScreens.length}, 100%, 50%)`;
      sDiv.innerHTML = `
        <div class="screen-index-label">${index}</div>
      `


      sDiv.addEventListener('dragover', (e) => {
        if (e.dataTransfer.types.includes('text/uri-list')) {
          // add hover effect when dragging over
          sDiv.classList.add('screen-div-hover');

          e.preventDefault();
          e.stopPropagation();
        }
      });

      sDiv.addEventListener('dragleave', (e) => {
        // remove hover effect when dragging out
        sDiv.classList.remove('screen-div-hover');

        e.preventDefault();
        e.stopPropagation();
      });

      sDiv.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();

        div.style.display = 'none';

        if (e.dataTransfer.types.includes('text/uri-list')) {
          const url = e.dataTransfer.getData('text/uri-list')
          chrome.runtime.sendMessage({ func: 'open-new-tab', screenIndex: index, url });
        }
      });

      div.appendChild(sDiv);

      const closeDiv = document.createElement('div');
      closeDiv.className = 'close-div';
      closeDiv.innerHTML = '<div>X</div>';

      closeDiv.addEventListener('click', () => {
        div.style.display = 'none';
        e.preventDefault();
        e.stopPropagation();
      });

      closeDiv.addEventListener('dragover', (e) => {
        div.style.display = 'none';
        e.preventDefault();
        e.stopPropagation();
      });

      div.appendChild(closeDiv);
    });
  }


  // when drag a url, show the div
  document.addEventListener('dragstart', async (e) => {
    if (e.dataTransfer.types.includes('text/uri-list')) {
      setTimeout(async () => {
        await freshScreenDivs(div, {
          dragX: e.clientX,
          dragY: e.clientY
        });
      }, 10);
    }
  })

  // after drag a url, hide the div
  document.addEventListener('dragend', (e) => {
    div.style.display = 'none';
  })

})()