const fetchData = async () => {
  const response = await fetch('https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json');
  const rawData = await response.json();
  const data = rawData.soles;

  if (!data || data.length === 0) {
    console.error('Invalid data format, soles property not found or empty');
    return;
  }

  const latestSolData = data[0];
  console.log(latestSolData); // Moved outside the map function

  const solData = data.map((currentSolData) => {
    const {
      id,
      terrestrial_date,
      sol,
      ls,
      season,
      min_temp,
      max_temp,
      pressure,
      pressure_string,
      abs_humidity,
      wind_speed,
      wind_direction,
      atmo_opacity,
      sunrise,
      sunset,
      local_uv_irradiance_index,
      min_gts_temp,
      max_gts_temp,
    } = currentSolData;
    return {
      id,
      terrestrial_date,
      sol,
      ls,
      season,
      min_temp,
      max_temp,
      pressure,
      pressure_string,
      abs_humidity,
      wind_speed,
      wind_direction,
      atmo_opacity,
      sunrise,
      sunset,
      local_uv_irradiance_index,
      min_gts_temp,
      max_gts_temp,
    };
  });
  return {
    latestSolData,
    solData,
  };
};



fetchData().then(data)

