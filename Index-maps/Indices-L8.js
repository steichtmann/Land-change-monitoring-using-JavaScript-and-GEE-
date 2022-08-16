/* READ ME/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

This script provides a template to create maps for the indices NDVI, NDBI, NDMI, MNDWI and a Land Surface Temperature (LST) map. The script works well with the
USGS Landsat 8 Level 2, Collection 2, Tier 1 dataset (LANDSAT/LC08/C02/T1_L2).

The script is structured in sections. Some sections require some input data to run through successfully. 
The sections are liste in the following, its is also indicated if input data needs to be provided.

  1. ROI                *Input required
  2. PRE-PROCESSING     
  3. IMAGE              *Input required
  4. LAYERS
  5. EXPORT             *Input required
  
*/;

//1)  ROI//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//>>  INPUTS
var roi = ee.FeatureCollection('*Input here*');

//2)  PRE-PROCESSING///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //Preprocessing of ROI
        var empty = ee.Image().byte();

        var outline = empty.paint({
          featureCollection: roi,
          color: 1,
          width: 2
        });
        
        function cliproi(image) {
          return image.clip(roi);
        }
        
      //Scaling and masking
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
            var ndbi = image.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI');
            var ndmi = image.normalizedDifference(['SR_B5', 'SR_B6']).rename('NDMI');
            var mndwi = image.normalizedDifference(['SR_B3', 'SR_B6']).rename(['MNDWI']);
          return image.addBands([ndvi, ndbi, ndmi, mndwi]);
        };

//3)  IMAGE///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//>>  INPUTS
var date_start  = '2020-04-01';
var date_end    = '2020-07-01'; 
var cloud_cover = 20;

      //Load dataset, filter and pre-process it
        var img = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                    .filterDate(date_start, date_end)
                    .filterBounds(roi)
                    .map(cliproi)
                    .filter(ee.Filter.lt('CLOUD_COVER', ee.Number(cloud_cover)))
                    .map(prepSrL8)
                    .map(addBands)
                    .median();

      //Create composite 
        var composite = img.select('NDVI', 'NDBI', 'NDMI', 'MNDWI', 'ST_B10');
      
      //Calculate mean, max. and min. values from indice
        var meanDictionary = composite.reduceRegion({reducer: ee.Reducer.mean(), geometry: roi.geometry(),scale: 30,maxPixels: 1e9});
        var minMaxDictionary = composite.reduceRegion({reducer: ee.Reducer.minMax(),geometry: roi.geometry(),scale: 30,maxPixels: 1e9});
        
      //Display
        print(img);
        print(meanDictionary, 'Indices mean values');
        print(minMaxDictionary, 'Indices max/min values');

//4)  LAYERS///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //Create and display indice layers
        var withNDVI = img.select('NDVI');
        var withNDMI = img.select('NDMI');
        var withNDBI = img.select('NDBI');
        var withMNDWI = img.select('MNDWI');
        
        var ndmiParams = {min: -1, max: 1, palette: ['red', 'white', 'blue']};
        var mndwiParams = {min: -1, max: 1, palette: ['white', 'beige', 'blue']};
        var ndbiParams = {min: -1, max: 1, palette: ['white', 'white', 'black']};
        var ndviParams = {min: -1, max: 1, palette: ['blue', 'white', 'green']};

        Map.addLayer(withMNDWI, mndwiParams, 'MNDWI');
        Map.addLayer(withNDMI, ndmiParams, 'NDMI');
        Map.addLayer(withNDVI, ndviParams, 'NDVI');
        Map.addLayer(withNDBI, ndbiParams, 'NDBI');
                
      //Create and display LST layer
        var withLST = img.select('ST_B10').subtract(273.15);
        
        var minMaxLST = withLST.reduceRegion({reducer: ee.Reducer.minMax(), 
                                       geometry: roi, 
                                       scale: 30
        });
                                       
        var minMax = minMaxLST.rename(minMaxLST.keys(), ['max','min']);  

        minMax.evaluate(function(val){
          var min = val.min;
          var max = val.max;
        var visParams = {
                min: min,
                max: max,
                palette: ['white', 'yellow', 'red']
                };
        
        Map.addLayer(withLST, visParams, 'LST'); });

      //Create and display RGB and FCC composite
        var rgbParams = {bands: ['SR_B4', 'SR_B3', 'SR_B2'], min: 0, max: 0.2};
        var fccParams = {bands: ['SR_B5', 'SR_B4', 'SR_B3'], min: 0, max: 0.3};

        Map.addLayer(img, rgbParams, 'RGB');
        Map.addLayer(img, fccParams, 'FCC');
  
//5)  EXPORT////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//>>  INPUT
var output_image = *Input here*
      
      //Export to drive
        Export.image.toDrive({
          image: output_image,
          description: 'image',
          scale: 30
        });
