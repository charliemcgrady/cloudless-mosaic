const execSync = require('child_process').execSync;
const fs = require('fs');
const input = require('commander');

input
  .version('0.1.0')
  .option('--process-individual-bands', 'Merge R,G,B bands', false)
  .option('--mosaic-images', 'Reapply geo information to R,G,B bands and mosaic the result', false)
  .option('--processed-images-suffix [processedImageSuffix]', 'The suffix for processed images')
  .option('--run-id <runId>', 'The id for the run')
  .parse(process.argv);

const runId = input.runId
const processedImageSuffix = this.processedImageSuffix || 'merged';

const finalDir = `output/final/${runId}`
fs.mkdirSync(finalDir, { recursive: true });

const executeCommand = command => execSync(command, { encoding: 'utf-8', stdio: 'inherit' })

const createRGBTifFromInvididualBands = feature => {
  const assetsDir = `${feature.properties.collection}/${feature.properties.datetime.split("T")[0]}`;
  const tempDir = `output/${runId}/temp/${feature.id}`
  fs.mkdirSync(tempDir, { recursive: true });

  executeCommand(`
  	for BAND in {4,3,2}; do
    		gdalwarp -t_srs EPSG:3857 ${assetsDir}/${feature.id}_B$BAND.TIF ${tempDir}/$BAND-projected.tif;
  	done

    convert -combine ${tempDir}/{4,3,2}-projected.tif ${tempDir}/RGB.tif
    convert -depth 8 ${tempDir}/RGB.tif ${tempDir}/RGB-8bit.tif
  `)
}

const reapplyGeoInfo = feature => {
  const tempDir = `output/${runId}/temp/${feature.id}`

  executeCommand(`
  	listgeo -tfw ${tempDir}/4-projected.tif
  	mv ${tempDir}/4-projected.tfw ${tempDir}/RGB-8bit-2.tfw

    python-lib/gdal_edit.py -a_srs EPSG:3857 ${tempDir}/RGB-8bit-2.tif
    rio edit-info --nodata 0 ${tempDir}/RGB-8bit-2.tif

    cp ${tempDir}/RGB-8bit-2.tif ${finalDir}/${feature.id}-merged.tif
  `)
}

const mosaicImages = features => {
  let finalFilepaths = "";
  features.forEach((feature) => {
    finalFilepaths += ` ${finalDir}/${feature.id}-${processedImageSuffix}.tif`
  });

  executeCommand(`
    gdalwarp ${finalFilepaths} ${finalDir}/${runId}-mosaic-${Date.now()}.tif
  `);
}

const features = require(`./output/${runId}/filtered-results.json`).features;

if (input.processIndividualBands) {
  features.forEach((feature) => {
    createRGBTifFromInvididualBands(feature);
  });
}

if (input.mosaicImages) {
  features.forEach((feature) => {
    reapplyGeoInfo(feature);
  });

  mosaicImages(features);
}

// function processScene(feature) {
//   const assetsDir = `${feature.properties.collection}/${feature.properties.datetime.split("T")[0]}`;

//   executeCommand(`
//   	for BAND in {4,3,2}; do
//     		gdalwarp -t_srs EPSG:3857 ${assetsDir}/${feature.id}_B$BAND.TIF ${tempDir}/$BAND-projected.tif;
//   	done

//     convert -combine ${tempDir}/{4,3,2}-projected.tif ${tempDir}/RGB.tif
//     convert -depth 8 ${tempDir}/RGB.tif ${tempDir}/RGB-8bit.tif

//   	listgeo -tfw ${tempDir}/4-projected.tif
//   	mv ${tempDir}/4-projected.tfw ${tempDir}/RGB-8bit.tfw

//     python-lib/gdal_edit.py -a_srs EPSG:3857 ${tempDir}/RGB-8bit.tif
//     rio edit-info --nodata 0 ${tempDir}/RGB-8bit.tif

//     mv ${tempDir}/RGB-8bit.tif ${finalDir}/${feature.id}-merged.tif
//   `)
// }

// function baselineScene(feature, baselineFeature) {
//   console.log(`Baselining feature ${feature.id}`)
//   if (baselineFeature.id !== feature.id) {
//     executeCommand(`
//       rio hist -c RGB ${finalDir}/${feature.id}-merged.tif ${finalDir}/${baselineFeature.id}-merged.tif ${finalDir}/${feature.id}-baselined.tif
//     `)
//   }
// }

// function normalizeScene(feature) {
//   console.log(`Normalizing feature ${feature.id}`)
//   executeCommand(`
//     convert -colorspace HSL -channel lightness -equalize -colorspace sRGB ${tempDir}/RGB.tif ${tempDir}/RGB.tif
//     # convert -colorspace HSL -equalize -colorspace sRGB ${finalDir}/${feature.id}-merged.tif ${finalDir}/${feature.id}-normalized.tif    
//     convert ${finalDir}/${feature.id}-merged.tif -channel RGB -equalize ${finalDir}/${feature.id}-normalized.tif
//     `)
// }
