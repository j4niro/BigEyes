import './App.css'
import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "./Redux/Hooks/StoreHooks";
import  {loadEarthImage}  from "./Redux/Slice/DataThunk";
import { SettingPan } from './Components/SettingPan';
import { Map } from './Components/Map';


function App() {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.data.tempData);
  const mapSize = useAppSelector((state)=> state.data.mapSize);
   const mapHeight = useAppSelector((state) => state.globalState.mapHeight)

  useEffect(() => {
    dispatch(loadEarthImage());
  }, [dispatch]);

  if (!mapSize) return <p>Loading map...</p>;

  return (
      <div className="app-container">
        <div 
        className='setting-pan-wrapper'
        style={{ maxHeight: `${mapHeight - 40}px`, overflowY: 'auto' }}
        >
              <SettingPan />
        </div>
        <Map />
      </div>
  )
}

export default App
