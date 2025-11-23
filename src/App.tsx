import './App.css'
import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "./Redux/Hooks/StoreHooks";
import  {loadEarthImage}  from "./Redux/Slice/DataThunk";


function App() {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.data.tempData);
  const mapSize = useAppSelector((state)=> state.data.mapSize);

  useEffect(() => {
    dispatch(loadEarthImage());
  }, [dispatch]);

  if (!mapSize) return <p>Loading map...</p>;

  return (
      <div>
        <h1>Welcome to BigEyes</h1>
        <p>Map Size : H = {mapSize?.height} W = {mapSize?.width} </p>
        <p>Sample number: 4050 = { data.tempanomalies.length }</p>
        <p>Year number: 146 = { data.tempanomalies[0].data.length }</p>
        <p>
          First example anomaly (-88, -178 in 1880 = NA): (
            { data.tempanomalies[0].lat }, { data.tempanomalies[0].lon } in {" "}
            { data.tempanomalies[0].data[0].year } = { data.tempanomalies[0].data[0].value } 
          )
        </p>
        <p>
          Example anomaly (-84, -138 in 1980 = 0.749166649921487): (
            { data.tempanomalies[100].lat }, { data.tempanomalies[100].lon } in {" "}
            { data.tempanomalies[100].data[100].year } = { data.tempanomalies[100].data[100].value } 
          )
        </p>
        <p>
          Example anomaly (80, -98 in 2021 = 3.64270825191246): (
            { data.tempanomalies[3800].lat }, { data.tempanomalies[3800].lon } in {" "}
            { data.tempanomalies[3800].data[141].year } = { data.tempanomalies[3800].data[141].value } 
          )
        </p>
        <p>
          Last example anomaly (88, 178 in 2025 = 3.32249992573634): (
            { data.tempanomalies[4049].lat }, { data.tempanomalies[4049].lon } in {" "}
            { data.tempanomalies[4049].data[145].year } = { data.tempanomalies[4049].data[145].value } 
          )
        </p>
      </div>
  )
}

export default App
