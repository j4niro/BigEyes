import { createAsyncThunk } from "@reduxjs/toolkit";
import { loadImage } from "../../Utils/MapImageLoader";

export const loadEarthImage = createAsyncThunk(
  "tempData/loadEarthImage",
  async () => {
    const img = await loadImage("/earth.png");
    return { width: img.naturalWidth, height: img.naturalHeight };
  }
);
