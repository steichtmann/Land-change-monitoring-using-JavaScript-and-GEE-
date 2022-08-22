/*README//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  This script provides a template to define a region of interest which will be subject to 
  a land cover classification or NDVI investigations. The script creates a
  RGB and FCC composite of a chosen geographical area.

DRAWING A REGION OF INTEREST
  This is a quick description of how to determine a region of interest, which will be 
  
  1. Use the GEE drawing tool.
  2. Create one geometry import, which outlines the region of interest.
  3. Go to "Edit layer properties" and assign the name 'roi' to the geometry.
  
The script will only work if the name is properly attributed.

ADDITIONAL INPUTS TO CONSIDER
  Additionally, the script requires a number of input data.
  The script is sctructured in sections. An overview of all sections 
  is provided in the following and it is indicated if inputs are required:

  1) PREPROCESSING
  2) IMAGE                        *Input required
  3) LAYERS AND DISPLAYING      
  4) EXPORT 
  5) AREA CALCULATION
  
The EXPORT section exports the studyarea as a feature so that it can be used as
a geographical border for the subsequent land cover classification and NDVI investigations.
  
*/

//1)  PRE-PROCESSING/////////////////////////////////////////////////////////////////////////////////////////////////
      // Scaling and masking
      function prepSrL8(image) {
        var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);
        var saturationMask = image.select('QA_RADSAT').eq(0);
      
        var getFactorImg = function(factorNames) {
          var factorList = image.toDictionary().select(factorNames).values();
          return ee.Image.constant(factorList);
        };
        var scaleImg = getFactorImg([
          'REFLECTANCE_MULT_BAND_.|TEMPERATURE_MULT_BAND_ST_B10']);
        var offsetImg = getFactorImg([
          'REFLECTANCE_ADD_BAND_.|TEMPERATURE_ADD_BAND_ST_B10']);
        var scaled = image.select('SR_B.|ST_B10').multiply(scaleImg).add(offsetImg);
      
        return image.addBands(scaled, null, true)
          .updateMask(qaMask).updateMask(saturationMask);
      }

      //Add quality bands
      var addBands = function(image) {
        var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
        return image.addBands([ndvi]);
      };

//2)  IMAGE/////////////////////////////////////////////////////////////////////////////////////////////////////////////
//>>  Inputs
var date_start  = '2021-04-01'  // L8 from:   2013-03-18
var date_end    = '2021-07-01'  //    until:  2022-05-21 
var cloud_cover = 10            // [%]

      // Load dataset, filter and pre-process it
      var img = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                  .filterDate(date_start, date_end)
                  .filterBounds(roi)
                  .filter(ee.Filter.lt('CLOUD_COVER', ee.Number(cloud_cover)))
                  .map(prepSrL8)
                  .map(addBands)
                  .median();
      
      print(img)


//3)  LAYERS AND DISPLAYING////////////////////////////////////////////////////////////////////////////////////////////////

      var withNDVI = img.select('NDVI');
      
      var ndviParams = {min: -1, max: 1, palette: ['blue', 'white', 'green']};
      var rgbParams = {bands: ['SR_B4', 'SR_B3', 'SR_B2'], min: 0, max: 0.2};
      var fccParams = {bands: ['SR_B5', 'SR_B4', 'SR_B3'], min: 0, max: 0.3};
      
      
      Map.addLayer(img, rgbParams, 'RGB');
      Map.addLayer(img, fccParams, 'FCC');
      Map.addLayer(withNDVI, ndviParams, 'NDVI');


//4)  EXPORT///////////////////////////////////////////////////////////////////////////////////////////////////////////////
      var studyarea = ee.FeatureCollection([
        ee.Feature(roi)
      ]);
      
      Export.table.toAsset({
        collection: studyarea,
        description:'studyarea',
        assetId: 'studyarea',
      });


//5)  AREA  CALCULATION/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      var area = roi.area({'maxError': 1});
      
      print('roi.area(...)=', area);
