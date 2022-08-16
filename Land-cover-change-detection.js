
/* READ ME/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

This script provides a template to investigate on land cover change based on land cover classification maps.
The script creates a land cover change map between two desired years to investigate the substitution of differet classes
amonst each other.
The land cover maps have to be provided to the script.

The script is structured in sections. Some sections require some input data to run through successfully. 
The sections are liste in the following, its is also indicated if input data needs to be provided.

  1. IMPORT                       *Input required
  2. LAND COVER CHANGE ANALYSIS
  3. AREA CALCULATION
  4. EXPORT
  

*/

//1)  IMPORT///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//>>  INPUT

var roi = ee.FeatureCollection('*Input here*');

var Start_year = ee.Image('*Input here*');
var End_year = ee.Image('*Input here*');

var classes         = [0, 1, 2, 3, 4];
var Color_palette   = {min: 0, max: 4, palette: ['FF8C00', '006400', 'CCC68b', 'E8DED1', '6699cc']};
var pixel_size      = ee.Number(10)

      //Display
        Map.addLayer(Start_year, Color_palette, 'Start year');
        Map.addLayer(End_year, Color_palette, 'End year');


//2)  LAND COVER CHANGE ANALYSIS////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //Change analysis
        var changes = ee.ImageCollection(ee.List(
                      classes.map(function (from, i) {
                        return classes.map(function (to,  j) {
                          var changeValue = classes.length * i + j + 0;
                          return Start_year.eq(from)
                          .and(End_year.eq(to))
                          .multiply(changeValue)
                          .int8();
                        });
                      })
        ).flatten()).reduce(ee.Reducer.sum());

        //Display
          Map.addLayer(changes.randomVisualizer(), null, 'changes');

//3)  AREA CALCULATION///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //Area calculation of the entire ROI
        var ROI_A = roi.geometry().area().divide(1e6);
      
      //Area calculation of each land cover change class
        var class_A = function(image){
          var areaImage = ee.Image.pixelArea().addBands(
                image);
           
          var areas = areaImage.reduceRegion({
                reducer: ee.Reducer.sum().group({
                groupField: 1,
                groupName: 'class',
              }),
              geometry: roi.geometry(),
              scale: pixel_size, 
              maxPixels: 1e8
              }); 
          
          var classAreas = ee.List(areas.get('groups'));
           
          var classAreaLists = classAreas.map(function(item) {
            var areaDict = ee.Dictionary(item);
            var classNumber = ee.Number(areaDict.get('class')).format();
            var area = ee.Number(
              areaDict.get('sum')).divide(1e6); 
            return ee.List([classNumber, area]);
          });
           
          var result = ee.Dictionary(classAreaLists.flatten());
          return(result);
        };

      //Display
        print(ROI_A, 'Area ROI');
        print(class_A(changes), 'Areas of change')
        print(class_A(Start_year), 'Class areas in the start year')
        print(class_A(End_year), 'Class areas in the end year')

//4)  EXPORT/////////////////////////////////////////////////////////////////////////////////////////////////////////

  Export.image.toDrive({
    image: changes,
    description: 'change map',
    region: roi,
    scale: pixel_size,
    maxPixels:1e13
  });
