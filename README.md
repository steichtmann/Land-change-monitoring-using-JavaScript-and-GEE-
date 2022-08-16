# Land change monitoring using JavaScript and GEE

These scripts are the product of time series analyses I conducted in the course of my master thesis project. In the master thesis I investigated land cover and vegetation change in areas of resource extraction at the source of energy transition supply chains. However, the scripts can be used in any study area being subject to land cover and vegetation cover change.

The folder 'Land-cover-classification' contains scripts to create land cover maps with a supervised-pixel based classification, based on the Random Forest (RF) classifier. The folder 'Index-maps' contains scripts to create maps of the NDVI, NDBI, MNDWI and NDMI. To be able to cover various years and resolutions the scripts are provided in three different versions covering the [Landsat 5](https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LT05_C02_T1_L2), [Landsat 8](https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2) and [Sentinel 2](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR) datasets respectively. 

With the output images of the land cover classification and the index maps, time series can be created and change detection can be conducted. With the script 'Land-cover-change-detection' changes in the land cover in between two years can be investigated. With the script 'NDVI-differencing' the NDVI differencing method can be conducted and changes in vegetation cover in between two years can be detected.

The following flowchart depicts basic methods which are used in the scripts and outlines the workflow to monitor land cover and vegetation change in the desired study area. The shown steps and methods are compiled of commands and algorithms from GEE Guides and JavaScript libraries.

![Workflow](https://github.com/steichtmann/Land-change-monitoring-using-JavaScript-and-GEE-/blob/603c4e58a92ed86a0831684d3ebd7e838c5ee384/Workflow-land-change-monitoring-.png)

