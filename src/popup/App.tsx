import React, { useEffect, useReducer } from 'react'

type UserSetting = {
  width: number,
  height: number
}

async function getUserSetting(): Promise<UserSetting> {
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

function App(): JSX.Element {
  const defaultSettings: UserSetting = { width: 320, height: 180 }

  const [userSetting, dispatch] = useReducer((state:UserSetting, action:{
    type: string,
    payload: any
  }) => {
    switch (action.type) {
      case 'width':
        return { ...state, width: action.payload }
      case 'height':
        return { ...state, height: action.payload }
      default:
        console.error('Unknown action type')
        return state
    }
  }, defaultSettings)

  useEffect(() => {
    getUserSetting().then((setting) => {
      if (setting) {
        Object.entries(setting).forEach(([key, value]) => {
          dispatch({ type: key, payload: value })
        })
      }
    })
  }, [])

  const save = async () => {
    chrome.storage.sync.set({ setting: userSetting }, () => {
      alert('Saved')
    })
  }

  const reset = () => {
    Object.entries(defaultSettings).forEach(([key, value]) => {
      dispatch({ type: key, payload: value })
    })
  }

  return (
    <div>
      <div className="operations-panel">
        <div>Input screens json</div>
        <div>
          <button type="button" id="reset" onClick={reset}>Reset</button>
          <button type="button" id="btn" onClick={save}>Save</button>
        </div>

      </div>

      <div className="setting-size-panel">
        <div>
          <input
            onChange={(e) => { dispatch({ type: 'width', payload: +e.target.value }) }}
            value={userSetting.width}
            type="range"
            id="width"
            name="width"
            min="0"
            max="2000"
          />
          <label htmlFor="width">
            Width:
            {userSetting.width}
            px
          </label>
        </div>

        <div>
          <input
            onChange={(e) => { dispatch({ type: 'height', payload: +e.target.value }) }}
            value={userSetting.height}
            type="range"
            id="height"
            name="height"
            min="0"
            max="2000"
          />
          <label htmlFor="height">
            Height:
            {userSetting.height}
            px
          </label>
        </div>
      </div>
    </div>
  )
}

export default App
