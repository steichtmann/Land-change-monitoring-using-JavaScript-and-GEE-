
/*READ ME//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  This script provides a template to conduct a supervised pixel-based land cover classification with the
  Sentinel-2 MSI: MultiSpectral Instrument, Level-2A dataset (COPERNICUS/S2_SR) and a subsqeuent accuracy assessment.
  This script uses the Random Forest algorithm to conduct classification. 

COLLECTION OF TRAINING AND TESTING DATA
  The supervised pixel-based approach requires the collection of training data.
  The accuracy assessment requires the collection of testing data.
  Testing and training data are supposed to be collected by manually drawing polygons on the map by using
  the GEE drawing tools. A number of things should be considered when collecting the training and testing data:

  1. Use the GEE drawing tool.
  2. Create one geometry import per land cover class and from each class a train and test dataset.
  3. Go to "Edit layer properties" and assign the following settings to each geometry:
      3.1.  Import as:      Feature collection.
      3.2.  Property:       Assign unique class name and indicate testing or training data in that name.
      3.3.  Value:          Assign a unique number per class but same for training and testing set per class. Start with 0.
  4. Start collecting data. Use segmententation layer and spectral profiles in the console to verify data quality.

ADDITIONAL INPUTS TO CONSIDER
  To conduct analysis successfully, the script requires a number of input data.
  The script is sctructured in sections, almost all sections have a sub-section called "Inputs", here information
  has to be provided so that the section can run successfully. The rest of the script can remain untouched to conduct analysis.
  An overview of all sections is provided in the following and it is indicated if inputs are required:

  1) ROI (Region of interest)     *Input required
  2) PREPROCESSING
  3) IMAGE COMPOSITE              *Input required
  4) PRE-CLASSIFICATION           *Input required
  5) CLASSIFICATION               *Input required
  6) ACCURACY ASSESSMENT          *Input required
  7) LEGEND                       *Input required
  8) EXPORT                       *Input required

*/;

//1)  ROI/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//>>  INPUT
var roi = ee.FeatureCollection('*INPUT HERE*');


//2)  PREPROCESSING///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
          
      //Quality bands
          var addBands = function(image) {
                  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
                  var ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI');
                  var ndmi = image.normalizedDifference(['B8', 'B11']).rename('NDMI');
                  var mndwi = image.normalizedDifference(['B3', 'B11']).rename(['MNDWI']);
            return image.addBands([ndvi, ndbi, ndmi, mndwi]);
          };

//3)  IMAGE COMPOSITE/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//>>  INPUT
var Date_start  = '2021-04-01';
var Date_end    = '2021-07-01';
var Cloud_Cover = 10;


      //Load dataset, filter and pre-process it
          var image = ee.ImageCollection('COPERNICUS/S2_SR')
                      .filterBounds(roi)
                      .map(cliproi)
                      .filterDate(Date_start, Date_end)
                      .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', ee.Number(Cloud_Cover)))
                      .map(maskS2clouds)
                      .map(addBands)
                      .median();
                  
      //Create composite for classification
          var bands = ['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12','NDVI','NDBI','NDMI','MNDWI'];
                 
          var composite = image.select(bands);
                  
      //Display
        Map.addLayer(image, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.2}, 'True Color Image');
        
        print(image);
                 
//4)  PRE-CLASSIFICATION//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//>>  INPUT
var SegmentationGridSize  = 50;
var Classes_for_SpectralProfiles  = *INPUT HERE*; //e.g.: class0.merge(class1)...
    
    
      //Segmentation
          var imageS = composite
                        .float()
                        .divide(255)
          ;
          
          var seedsS = ee.Algorithms.Image.Segmentation.seedGrid(SegmentationGridSize);
          
          var snicS = ee.Algorithms.Image.Segmentation.SNIC({
                        image: imageS, 
                        compactness: 0,
                        connectivity: 8,
                        neighborhoodSize: 10,
                        size: 10,
                        seeds: seedsS
          });
          
          var clusters_snicS = snicS.select("clusters");
          
          var vectorsS = clusters_snicS.reduceToVectors({
                          geometryType: 'polygon',
                          reducer: ee.Reducer.countEvery(),
                          scale: 10,
                          maxPixels: 1e13,
                          geometry: roi,
          });
          
          
          var empty = ee.Image().byte();
          
          
          var segments = empty.paint({
                          featureCollection: vectorsS,
                          color: 1,
                          width: 1
          });
          
      //Spectral profiles
          var subset = image.select('B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12');
          
          var plotOptions = {
                          title: 'Spectral profiles',
                          hAxis: {title: 'Wavelength (nanometers)'},
                          vAxis: {title: 'Reflectance'},
                          lineWidth: 1,
                          pointSize: 4
          };
          
          var wavelengths = [490,560,665,705,740,783,842,865,1610,2190];
          
          
          var spectral_chart = ui.Chart.image.regions(subset, Classes_for_SpectralProfiles, ee.Reducer.mean(), 100, 'class', wavelengths)
                              .setChartType('ScatterChart')
                              .setOptions(plotOptions)
          ;
          
        //Display
          Map.addLayer(segments, {palette: 'FF0000'}, 'Segmentation');
          
          print(spectral_chart);


//5)  CLASSIFICATION//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//>>  INPUT
var Train_Samples   = *INPUT HERE*; // e.g. class0.merge(class1)...
var Color_Palette   = {min: 0, max: 4, palette: ['FF8C00', '006400', 'CCC68b', 'E8DED1', '6699cc']};
var Cluster_Size    = 1;
  
      //Classification process
          var training = composite.sampleRegions({
                          collection: Train_Samples,
                          properties: ['class'],
                          scale: 10
          });
          
          var classifier = ee.Classifier.smileRandomForest(100).train({
                            features: training,
                            classProperty: 'class',
                            inputProperties: bands
          });
          
          var classified = composite
                            .classify(classifier)
          ;
          
      //Post-classification
          var clusterMajority = classified
                                .focalMode(Cluster_Size)
          ;
          
      // Display
        Map.addLayer(classified, Color_Palette,'Land Cover Map');
        Map.addLayer(clusterMajority, Color_Palette, 'Land Cover Map (clustered)');

//6)  ACCURACY ASSESSMENT/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//>>  INPUT
var Test_Samples  = *INPUT HERE*; // e.g. class0.merge(class1)...
var Class_Values  = ee.List([0,1,2,3,4]);
var Test_Points   = ee.List([50,50,50,50,50]);

      //Accuracy assessment
        var classes = ee.Image().byte().paint(Test_Samples,'class').rename('class').addBands(classified);
    
        var testing = classes.stratifiedSample({
                        numPoints:  500,
                        classBand:  'class',
                        region:     roi,
                        scale:      10,
                        classValues: Class_Values,
                        classPoints: Test_Points,
                        geometries: true,
        });
        
        var trainAccuracy = classifier.confusionMatrix();
        var trainUA = trainAccuracy.consumersAccuracy();
        var trainKappa = trainAccuracy.kappa();
        var trainPA = trainAccuracy.producersAccuracy();
        
        
        var testAccuracy = testing.errorMatrix('class', 'classification');
        var testUA = testAccuracy.consumersAccuracy();
        var testKappa = testAccuracy.kappa();
        var testPA = testAccuracy.producersAccuracy();
        
    //Display
      Map.addLayer(testing, {}, 'Test Points');
        
      print('Train Error Matrix: ', trainAccuracy);
      print('Train Overall Accuracy: ', trainAccuracy.accuracy());
      print(trainUA,'Train Users Accuracy');
      print(trainKappa,'Train Kappa');
      print(trainPA,'Train Producers Accuracy');
        
      print('Test Error Matrix: ', testAccuracy);
      print('Test Overall Accuracy: ', testAccuracy.accuracy());
      print(testUA,'Test Users Accuracy');
      print(testKappa,'Test Kappa');
      print(testPA,'Test Producers Accuracy');
    
//7)  LEGEND////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
//>>  INPUT
var Nr_of_Classes    = 5; //Start Class count at zero.
var Names_of_Classes = ['class0', 'class1', 'class2'];
var Color_Palette    = ['color1', 'color2', 'color3']; //Do not use '#'

      //Create Legend
        var legend = ui.Panel({
            style: {
              position: 'bottom-left',
              padding: '8px 15px'
            }
          });
           
          var legendTitle = ui.Label({
            value: 'Land Cover Classes',
            style: {
              fontWeight: 'bold',
              fontSize: '18px',
              margin: '0 0 4px 0',
              padding: '0'
              }
          });
          
          legend.add(legendTitle);
    
          var makeRow = function(color, name) {
    
                var colorBox = ui.Label({
                  style: {
                    backgroundColor: '#' + color,
                    padding: '8px',
                    margin: '0 0 4px 0'
                  }
                });
           
                var description = ui.Label({
                  value: name,
                  style: {margin: '0 0 4px 6px'}
                });
           
                return ui.Panel({
                  widgets: [colorBox, description],
                  layout: ui.Panel.Layout.Flow('horizontal')
                });
          };
      
          for (var i = 0; i < Nr_of_Classes; i++) {
            legend.add(makeRow(Color_Palette[i], Names_of_Classes[i]));
          }
        
    //Display
          Map.add(legend);

//8)  EXPORT//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Export.image.toAsset({
        image: *INPUT HERE*,
        description: '*INPUT HERE*',
        scale: 10,
        region: roi
});
