# Land change monitoring using JavaScript and GEE

The folder 'Land-cover-classification' contains scripts to create land cover maps with a supervised-pixel based classification, based on the Random Forest (RF) classifier and a subsequent accuracy assessment. The folder 'Index-maps' contains scripts to create maps of the NDVI, NDBI, MNDWI and NDMI. To be able to cover various years and resolutions the scripts are provided in three different versions covering the [Landsat 5](https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LT05_C02_T1_L2), [Landsat 8](https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2) and [Sentinel 2](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR) datasets respectively. 

With the output images of the land cover classification and the index maps, time series can be created and change detection can be conducted. With the script 'Land-cover-change-detection' changes in the land cover in between two years can be investigated. With the script 'NDVI-differencing' the NDVI differencing method can be conducted and changes in vegetation cover in between two years can be detected.

Each script contains a brief README at the beginning, here information on what to consider while using the script is provided. This README can be copied in the GEE code editor as well.

The following flowchart depicts data and methods which are used in the scripts and outlines the workflow to monitor land cover and vegetation change in the desired study area. The shown steps and methods are compiled of commands and algorithms from GEE Guides and JavaScript libraries.

![Workflow](https://github.com/steichtmann/Land-change-monitoring-using-JavaScript-and-GEE-/blob/32113d81db9e18b4d4983a30a9fcd91295773cf5/Workflow-land-change-monitoring.png)

