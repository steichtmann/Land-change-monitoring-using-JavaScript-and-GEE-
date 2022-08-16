/* READ ME/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

This script provides a template to create maps for the indices NDVI, NDBI, NDMI, MNDWI. The script works well with the
Sentinel-2 MSI: MultiSpectral Instrument, Level-2A dataset (COPERNICUS/S2_SR).

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
      
      //Cloud masking
        function maskS2clouds(image) {
                  var qa = image.select('QA60');
                  var cloudBitMask = 1 << 10;
                  var cirrusBitMask = 1 << 11;
                  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
                      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
          return image.updateMask(mask).divide(10000);
        }

      //Add quality bands
        var addBands = function(image) {
          var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
          var ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI');
          var ndmi = image.normalizedDifference(['B8', 'B11']).rename('NDMI');
          var mndwi = image.normalizedDifference(['B3', 'B11']).rename(['MNDWI']);
          return image.addBands([ndvi, ndbi, ndmi, mndwi]);
        };

//3)  IMAGE///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//>>  INPUTS
var date_start  = '2019-01-01';
var date_end    = '2019-07-01';
var cloud_cover = 10;

      //Load dataset, filter and pre-process it
        var img = ee.ImageCollection('COPERNICUS/S2_SR')
                    .filterBounds(roi)
                    .map(cliproi)
                    .filterDate(date_start, date_end)
                    .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', ee.Number(cloud_cover)))
                    .map(maskS2clouds)
                    .map(addBands)
                    .median();
                    
      //Create composite
        var composite = img.select('NDVI', 'NDBI', 'NDMI', 'MNDWI');

      //Calculate mean, max. and min. values from indice
        var meanDictionary = composite.reduceRegion({reducer: ee.Reducer.mean(), geometry: roi.geometry(),scale: 30,maxPixels: 1e9});
        var minMaxDictionary = composite.reduceRegion({reducer: ee.Reducer.minMax(),geometry: roi.geometry(),scale: 30,maxPixels: 1e9});
        
      //Display
        print(img);
        print(meanDictionary, 'Indices mean values');
        print(minMaxDictionary, 'Indices max/min values');

//4)  LAYERS///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //Create and display indice maps
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

      //Create and display RGB and FCC composite
        var rgbParams = {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.2};
        var fccParams = {bands: ['B8', 'B5', 'B4'], min: 0, max: 0.3};
        
        Map.addLayer(img, rgbParams, 'RGB');
        Map.addLayer(img, fccParams, 'FCC');

//5)  EXPORT////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//>>  INPUT
var output_image = *Input here*
      
      //Export to drive
        Export.image.toDrive({
          image: output_image,
          description: 'image',
          scale: 10
        });
