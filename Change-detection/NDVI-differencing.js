/*README////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  This script provides a template to conduct an NDVI differencing analysis. The NDVI differencing analysis
  constitutes of the comparison of two NDVI maps from two different years and observe the change in NDVI values
  in each pixel of the image.
  
  The script is structured in sections. Section 1. requires the input of two NDVI maps so that the script can run
  run through successfully. Section 4. required the input of the desired export map to run through successfully.
  All sections are liste in the following:
  1. IMPORT             *Input required
  2. DIFFERENCING     
  3. DISPLAY
  4. EXPORT             *Input required
  
*/;

//1)  IMPORT///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      var year_01 = ee.Image('*Input here*');
      var year_02 = ee.Image('*Input here*');

//2)  DIFFERENCING//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      var NDVIchange = year_02.subtract(year_01);

//3)  DISPLAY////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      var ndviParams = {min: -1, max: 1, palette: ['blue', 'white', 'green']};
      
      Map.addLayer(NDVIchange, ndviParams, 'NDVI differencing');

//4)  EXPORT////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//>>  INPUT
var pixel_size = ee.Number(30)

      //Export to drive
        Export.image.toDrive({
          image: NDVI_change,
          description: 'NDVI_change',
          scale: pixel_size
        });
