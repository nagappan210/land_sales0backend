// const fs = require('fs').promises;
// const path = require('path');
// const sharp = require('sharp');
// const ffmpeg = require('fluent-ffmpeg');
// const db = require('../db');
// const { buffer } = require('stream/consumers');
// ffmpeg.setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe');
// const axios = require("axios");
// const ffmpegStatic = require('ffmpeg-static');
// ffmpeg.setFfmpegPath(ffmpegStatic);
// const fixPathForFfmpeg = (p) => `"${p.replace(/\\/g, "/")}"`;



// exports.createPostStep6 = async (req, res) => {
//   try {
//     let { user_id, user_post_id, post_type, video_url, image_urls } = req.body;

//     user_id = Number(user_id);
//     user_post_id = Number(user_post_id);
//     post_type = String(post_type);
//     const draft = 6;

//     if (isNaN(user_id) || isNaN(user_post_id)) {
//       return res.status(400).json({
//         result: "0",
//         error: "user_id and user_post_id must be integers",
//         data: []
//       });
//     }

//     const [exist_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
//     if (exist_user.length === 0) {
//       return res.status(404).json({ result: "0", error: "User not found", data: [] });
//     }

//     // VIDEO POST
//     if (post_type === "1" && video_url) {
//       const thumbDir = "uploaded/posts/thumbs";
//       await fs.mkdir(thumbDir, { recursive: true });
//       const outputThumbPath = path.join(thumbDir, `thumb_${Date.now()}.jpg`);

//       await new Promise((resolve, reject) => {
//         ffmpeg(video_url)
//           .on("end", resolve)
//           .on("error", reject)
//           .screenshots({
//             count: 1,
//             filename: path.basename(outputThumbPath),
//             folder: path.dirname(outputThumbPath),
//             size: "640x360"
//           });
//       });

//       const [videoUpdate] = await db.query(
//         `UPDATE user_posts 
//          SET video = ?, post_type = ?, image_ids = NULL, thumbnail = ?, updated_at = NOW(), draft = ? 
//          WHERE U_ID = ? AND user_post_id = ?`,
//         [video_url, post_type, outputThumbPath, draft, user_id, user_post_id]
//       );

//       if (videoUpdate.affectedRows === 0) {
//         return res.status(404).json({ result: "0", error: "Post not found", data: [] });
//       }

//       return res.json({
//         result: "1",
//         message: "Video URL and thumbnail saved",
//         post_type,
//         video: video_url,
//         thumbnail: `${process.env.SERVER_ADDRESS}/${outputThumbPath.replace(/\\/g, "/")}`
//       });
//     }

//     // IMAGE POST
//     if (post_type === "2" && Array.isArray(image_urls) && image_urls.length > 0) {
//       const tempDir = `uploaded/posts/${Date.now()}_sequence`;
//       await fs.mkdir(tempDir, { recursive: true });

//       const insertedImageIds = [];
//       let firstImagePath = null;

//       for (let i = 0; i < image_urls.length; i++) {
//         const url = image_urls[i];
//         const destPath = path.join(tempDir, `img_${String(i).padStart(3, "0")}.jpg`);

//         // Download remote image
//         let response;
//         try {
//           response = await axios.get(url, { responseType: "arraybuffer" });
//         } catch {
//           return res.status(400).json({ result: "0", error: `Failed to download image: ${url}`, data: [] });
//         }

//         // Convert buffer to JPEG
//         try {
//           await sharp(response.data)
//             .resize({ width: 1280, height: 720, fit: "contain", background: "#000" })
//             .jpeg()
//             .toFile(destPath);
//         } catch {
//           return res.status(400).json({ result: "0", error: `Invalid image file at URL: ${url}`, data: [] });
//         }

//         if (i === 0) firstImagePath = destPath;

//         const [result] = await db.query(
//           `INSERT INTO post_images (U_ID, user_post_id, image_path) VALUES (?, ?, ?)`,
//           [user_id, user_post_id, destPath]
//         );
//         insertedImageIds.push(result.insertId);
//       }

//       const outputVideoPath = `uploaded/posts/post_${Date.now()}.mp4`;

//       await new Promise((resolve, reject) => {
//         ffmpeg()
//           .input(path.join(tempDir, "img_%03d.jpg"))
//           .inputOptions(["-framerate 0.4"])
//           .outputOptions(["-c:v libx264", "-r 30", "-pix_fmt yuv420p"])
//           .on("end", resolve)
//           .on("error", reject)
//           .save(outputVideoPath);
//       });

//       const imageIdsStr = insertedImageIds.join(",");

//       const [imageUpdate] = await db.query(
//         `UPDATE user_posts 
//          SET video = ?, image_ids = ?, post_type = ?, thumbnail = ?, updated_at = NOW(), draft = ? 
//          WHERE U_ID = ? AND user_post_id = ?`,
//         [outputVideoPath, imageIdsStr, post_type, firstImagePath, draft, user_id, user_post_id]
//       );

//       if (imageUpdate.affectedRows === 0) {
//         return res.status(404).json({ result: "0", error: "Post not found", data: [] });
//       }

//       return res.json({
//         result: "1",
//         message: "Image URLs converted to video + thumbnail",
//         post_type,
//         video: `${process.env.SERVER_ADDRESS}/${outputVideoPath.replace(/\\/g, "/")}`,
//         thumbnail: `${process.env.SERVER_ADDRESS}/${firstImagePath.replace(/\\/g, "/")}`,
//         image_ids: insertedImageIds
//       });
//     }

//     return res.status(400).json({
//       result: "0",
//       error: "Invalid post_type or missing URLs",
//       data: []
//     });

//   } catch (err) {
//     console.error("Server error:", err);
//     return res.status(500).json({
//       result: "0",
//       error: err.message,
//       data: []
//     });
//   }
// };

const db = require('../db');
// const fount = require('../Fonts/arial')
const path = require("path");
const fs = require("fs").promises;
const fsp = require("fs").promises;
const axios = require("axios");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg"); 


// exports.createPostStep6 = async (req, res) => {
//   try {
//     let { user_id, user_post_id, post_type, video_url, image_urls } = req.body;

//     user_id = Number(user_id);
//     user_post_id = Number(user_post_id);
//     post_type = String(post_type);
//     const draft = 6;

//     if (isNaN(user_id) || isNaN(user_post_id)) {
//       return res.status(400).json({
//         result: "0",
//         error: "user_id and user_post_id must be integers",
//         data: []
//       });
//     }

//     const [exist_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
//     if (exist_user.length === 0) {
//       return res.status(404).json({ result: "0", error: "User not found", data: [] });
//     }

//     // VIDEO POST
//     if (post_type === "1" && video_url) {
//       const thumbDir = "uploaded/posts/thumbs";
//       await fs.mkdir(thumbDir, { recursive: true });
//       const outputThumbPath = path.join(thumbDir, `thumb_${Date.now()}.jpg`);

//       await new Promise((resolve, reject) => {
//         ffmpeg(video_url)
//           .on("end", resolve)
//           .on("error", reject)
//           .screenshots({
//             count: 1,
//             filename: path.basename(outputThumbPath),
//             folder: path.dirname(outputThumbPath),
//             size: "640x360"
//           });
//       });

//       const [videoUpdate] = await db.query(
//         `UPDATE user_posts 
//          SET video = ?, post_type = ?, image_ids = NULL, thumbnail = ?, updated_at = NOW(), draft = ? 
//          WHERE U_ID = ? AND user_post_id = ?`,
//         [video_url, post_type, outputThumbPath, draft, user_id, user_post_id]
//       );

//       if (videoUpdate.affectedRows === 0) {
//         return res.status(404).json({ result: "0", error: "Post not found", data: [] });
//       }

//       return res.json({
//         result: "1",
//         message: "Video URL and thumbnail saved",
//         post_type,
//         video: video_url,
//         thumbnail: `${process.env.SERVER_ADDRESS}/${outputThumbPath.replace(/\\/g, "/")}`
//       });
//     }

//     // IMAGE POST
//  // IMAGE POST
// if (post_type === "2" && Array.isArray(image_urls) && image_urls.length > 0) {
//   const tempDir = `uploaded/posts/${Date.now()}_sequence`;
//   await fs.mkdir(tempDir, { recursive: true });

//   const insertedImageIds = [];
//   let firstImagePath = null;

//   // Step 1: Download, resize, and overlay text on each image
//   for (let i = 0; i < image_urls.length; i++) {
//     const url = image_urls[i];
//     const destPath = path.join(tempDir, `img_${String(i).padStart(3, "0")}.jpg`);

//     // Download remote image
//     let response;
//     try {
//       response = await axios.get(url, { responseType: "arraybuffer" });
//     } catch {
//       return res.status(400).json({ result: "0", error: `Failed to download image: ${url}`, data: [] });
//     }

//     // Resize image
//     try {
//       await sharp(response.data)
//         .resize({ width: 1280, height: 720, fit: "contain", background: "#000" })
//         .jpeg()
//         .toFile(destPath);
//     } catch {
//       return res.status(400).json({ result: "0", error: `Invalid image file at URL: ${url}`, data: [] });
//     }

//     // Overlay text on image
//     const svgText = `
//       <svg width="1280" height="720">
//         <text x="50%" y="50%" font-size="48" text-anchor="middle" fill="white">
//           Hello World
//         </text>
//       </svg>
//     `;

//     const tempDestPath = path.join(tempDir, `temp_img_${String(i).padStart(3, "0")}.jpg`);

//     await sharp(destPath)
//   .composite([{ input: Buffer.from(svgText), gravity: 'center' }])
//   .toFile(tempDestPath)

//       await fs.rename(tempDestPath, destPath);


//     if (i === 0) firstImagePath = destPath;

//     // Save image info to DB
//     const [result] = await db.query(
//       `INSERT INTO post_images (U_ID, user_post_id, image_path) VALUES (?, ?, ?)`,
//       [user_id, user_post_id, destPath]
//     );
//     insertedImageIds.push(result.insertId);
//   }

//   // Step 2: Create video from images
//   const outputVideoPath = `uploaded/posts/post_${Date.now()}.mp4`;
//   await new Promise((resolve, reject) => {
//     ffmpeg()
//       .input(path.join(tempDir, "img_%03d.jpg"))
//       .inputOptions(["-framerate 0.4"])
//       .outputOptions(["-c:v libx264", "-r 30", "-pix_fmt yuv420p"])
//       .on("end", resolve)
//       .on("error", reject)
//       .save(outputVideoPath);
//   });

//   // Step 3: Add text overlay on the final video
//   const finalVideoPath = `uploaded/posts/post_${Date.now()}_text.mp4`;
//   await new Promise((resolve, reject) => {
//     ffmpeg(outputVideoPath)
//       .videoFilter("drawtext=text='Hello World':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2")
//       .on("end", resolve)
//       .on("error", reject)
//       .save(finalVideoPath);
//   });

//   // Step 4: Update user_posts with final video
//   const imageIdsStr = insertedImageIds.join(",");
//   const [imageUpdate] = await db.query(
//     `UPDATE user_posts 
//      SET video = ?, image_ids = ?, post_type = ?, thumbnail = ?, updated_at = NOW(), draft = ? 
//      WHERE U_ID = ? AND user_post_id = ?`,
//     [finalVideoPath, imageIdsStr, post_type, firstImagePath, draft, user_id, user_post_id]
//   );

//   if (imageUpdate.affectedRows === 0) {
//     return res.status(404).json({ result: "0", error: "Post not found", data: [] });
//   }

//   // Step 5: Return response
//   return res.json({
//     result: "1",
//     message: "Image URLs converted to video + thumbnail",
//     post_type,
//     video: `${process.env.SERVER_ADDRESS}/${finalVideoPath.replace(/\\/g, "/")}`,
//     thumbnail: `${process.env.SERVER_ADDRESS}/${firstImagePath.replace(/\\/g, "/")}`,
//     image_ids: insertedImageIds
//   });
// }


//     return res.status(400).json({
//       result: "0",
//       error: "Invalid post_type or missing URLs",
//       data: []
//     });

//   } catch (err) {
//     console.error("Server error:", err);
//     return res.status(500).json({
//       result: "0",
//       error: err.message,
//       data: []
//     });
//   }
// };

exports.createPostStep6 = async (req, res) => {
  try {
    let { user_id, user_post_id, post_type, video_url, image_urls } = req.body;

    user_id = Number(user_id);
    user_post_id = Number(user_post_id);
    post_type = String(post_type);
    const draft = 6;

    if (isNaN(user_id) || isNaN(user_post_id)) {
      return res.status(400).json({
        result: "0",
        error: "user_id and user_post_id must be integers",
        data: []
      });
    }

    const [exist_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
    if (exist_user.length === 0) {
      return res.status(404).json({ result: "0", error: "User not found", data: [] });
    }

    // VIDEO POST
    if (post_type === "1" && video_url) {
      const thumbDir = "uploaded/posts/thumbs";
      await fs.mkdir(thumbDir, { recursive: true });
      const outputThumbPath = path.join(thumbDir, `thumb_${Date.now()}.jpg`);

      await new Promise((resolve, reject) => {
        ffmpeg(video_url)
          .on("end", resolve)
          .on("error", reject)
          .screenshots({
            count: 1,
            filename: path.basename(outputThumbPath),
            folder: path.dirname(outputThumbPath),
            size: "640x360"
          });
      });

      const [videoUpdate] = await db.query(
        `UPDATE user_posts 
         SET video = ?, post_type = ?, image_ids = NULL, thumbnail = ?, updated_at = NOW(), draft = ? 
         WHERE U_ID = ? AND user_post_id = ?`,
        [video_url, post_type, outputThumbPath, draft, user_id, user_post_id]
      );

      if (videoUpdate.affectedRows === 0) {
        return res.status(404).json({ result: "0", error: "Post not found", data: [] });
      }

      return res.json({
        result: "1",
        message: "Video URL and thumbnail saved",
        post_type,
        video: video_url,
        thumbnail: `${process.env.SERVER_ADDRESS}/${outputThumbPath.replace(/\\/g, "/")}`
      });
    }

if (post_type === "2" && Array.isArray(image_urls) && image_urls.length > 0) {
  const tempDir = `uploaded/posts/${Date.now()}_sequence`;
  await fs.mkdir(tempDir, { recursive: true });

  const insertedImageIds = [];
  let firstImagePath = null;

  
  const [postData] = await db.query(
    `SELECT land_type_id, land_categorie_id, country, state, city, locality, property_name 
     FROM user_posts 
     WHERE U_ID = ? AND user_post_id = ?`,
    [user_id, user_post_id]
  );
  const post = postData[0] || {};


  let landTypeText = "";
  let landCategoryText = "";

  if (post.land_type_id === 1) landTypeText = "Residential";
  if (post.land_type_id === 2) landTypeText = "Commercial";
  if (post.land_type_id === 3) landTypeText = "Agriculture";

  if (post.land_categorie_id === 1) landCategoryText = "Flat/ Apartment";
  if (post.land_categorie_id === 2) landCategoryText = "Villa/Independent House";
  if (post.land_categorie_id === 3) landCategoryText = "Builder Floor Apartment";
  if (post.land_categorie_id === 4) landCategoryText = "Land/ Plot";
  if (post.land_categorie_id === 5) landCategoryText = "Studio Apartment";
  if (post.land_categorie_id === 6) landCategoryText = "Other";
  if (post.land_categorie_id === 7) landCategoryText = "Commercial Office Space";
  if (post.land_categorie_id === 8) landCategoryText = "Office in IT Park";
  if (post.land_categorie_id === 9) landCategoryText = "Commercial Shop";
  if (post.land_categorie_id === 10) landCategoryText = "Commercial Showroom";
  if (post.land_categorie_id === 11) landCategoryText = "Commercial Land";
  if (post.land_categorie_id === 12) landCategoryText = "Warehouse/ Godown";
  if (post.land_categorie_id === 13) landCategoryText = "Industrial Land";
  if (post.land_categorie_id === 14) landCategoryText = "Industrial Building";
  if (post.land_categorie_id === 15) landCategoryText = "Industrial Shed";
  if (post.land_categorie_id === 16) landCategoryText = "Other";
  if (post.land_categorie_id === 17) landCategoryText = "Farmhouse";
  if (post.land_categorie_id === 18) landCategoryText = "Agricultural Land";

  for (let i = 0; i < image_urls.length; i++) {
    const url = image_urls[i];
    const destPath = path.join(tempDir, `img_${String(i).padStart(3, "0")}.jpg`);

    let response;
    try {
      response = await axios.get(url, { responseType: "arraybuffer" });
    } catch {
      return res.status(400).json({ result: "0", error: `Failed to download image: ${url}`, data: [] });
    }

    try {
      await sharp(response.data)
        .resize({ width: 1280, height: 720, fit: "contain", background: "#000" })
        .jpeg()
        .toFile(destPath);
    } catch {
      return res.status(400).json({ result: "0", error: `Invalid image file at URL: ${url}`, data: [] });
    }

    if (i === 0) firstImagePath = destPath;

    const [result] = await db.query(
      `INSERT INTO post_images (U_ID, user_post_id, image_path) VALUES (?, ?, ?)`,
      [user_id, user_post_id, destPath]
    );
    insertedImageIds.push(result.insertId);
  }

  const fontPath = "Fonts/arial.ttf";
  const drawtextFilters = [];

if (image_urls.length > 0) {
  drawtextFilters.push(
    `drawtext=fontfile='${fontPath}':` +
    `text='• ${landTypeText}\n ${landCategoryText}\n${post.size || ''}':` +
    `fontcolor=white@0.9:fontsize=60:line_spacing=12:` + 
    `borderw=3:bordercolor=black:shadowcolor=black:shadowx=2:shadowy=2:` +
    `x=(w-text_w)/2:y=(h-text_h)/4:enable='between(n,0,0)'`
  );
}


if (image_urls.length > 1) {
  drawtextFilters.push(
    `drawtext=fontfile='${fontPath}':` +
    `text='${post.country || ''}\\n${post.state || ''}\\n${post.city || ''}\\n${post.locality || ''}':` +
    `fontcolor=yellow@0.85:fontsize=50:line_spacing=8:` +
    `borderw=2:bordercolor=black:shadowcolor=black:shadowx=2:shadowy=2:` +
    `x=(w-text_w)/2:y=(h-text_h)/2:enable='between(n,1,1)'`
  );
}

if (image_urls.length > 2) {
  drawtextFilters.push(
    `drawtext=fontfile='${fontPath}':` +
    `text='${post.property_name || ''}':` +
    `fontcolor=cyan@0.9:fontsize=48:line_spacing=5:` +
    `borderw=2:bordercolor=black:shadowcolor=black:shadowx=1:shadowy=1:` +
    `x=(w-text_w)/2:y=(h-text_h)*3/4:enable='between(n,2,2)'`
  );
}


  // Create final video
  const finalVideoPath = `uploaded/posts/post_${Date.now()}.mp4`.replace(/\\/g, "/");

  await new Promise((resolve, reject) => {
    ffmpeg(path.join(tempDir, "img_%03d.jpg"))
      .inputOptions(["-framerate 0.4"])
      .outputOptions(["-c:v libx264", "-r 30", "-pix_fmt yuv420p"])
      .videoFilter(drawtextFilters.join(","))
      .on("end", resolve)
      .on("error", reject)
      .save(finalVideoPath);
  });

  // Update DB with video info
  const imageIdsStr = insertedImageIds.join(",");
  const [imageUpdate] = await db.query(
    `UPDATE user_posts 
     SET video = ?, image_ids = ?, post_type = ?, thumbnail = ?, updated_at = NOW(), draft = ? 
     WHERE U_ID = ? AND user_post_id = ?`,
    [finalVideoPath, imageIdsStr, post_type, firstImagePath, draft, user_id, user_post_id]
  );

  if (imageUpdate.affectedRows === 0) {
    return res.status(404).json({ result: "0", error: "Post not found", data: [] });
  }

  return res.json({
    result: "1",
    message: "Image URLs converted to single video + text overlay",
    post_type,
    video: `${process.env.SERVER_ADDRESS}/${finalVideoPath.replace(/\\/g, "/")}`,
    thumbnail: `${process.env.SERVER_ADDRESS}/${firstImagePath.replace(/\\/g, "/")}`,
    image_ids: insertedImageIds
  });
}





    return res.status(400).json({
      result: "0",
      error: "Invalid post_type or missing URLs",
      data: []
    });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};


exports.createPostStep7 = async (req, res) => {
  const { user_id, user_post_id } = req.body;

  if (!user_id || !user_post_id) {
    return res.status(400).json({
      result: "0",
      error: "U_ID and user_post_id are required.",
      data: []
    });
  }

  if (isNaN(user_id) || isNaN(user_post_id)) {
    return res.status(400).json({
      result: "0",
      error: "U_ID and user_post_id must be integers.",
      data: []
    });
  }

  const [existing_user] = await db.query(
    `SELECT * FROM users WHERE U_ID = ?`,
    [user_id]
  );
  if (existing_user.length === 0) {
    return res.status(400).json({
      result: "0",
      error: "User not found in database",
      data: []
    });
  }

  const [existing_post] = await db.query(
    `SELECT * FROM user_posts WHERE user_post_id = ?`,
    [user_post_id]
  );
  if (existing_post.length === 0) {
    return res.status(400).json({
      result: "0",
      error: "User post not found in database",
      data: []
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT property_name,city, locality, property_area, price, description, amenities, facing_direction, video, image_ids, created_at
      FROM user_posts
      WHERE user_post_id = ? AND U_ID = ?
      `,
      [user_post_id, user_id]
    );
    const normalizedData = rows.map((property) => ({
      property_name: property.property_name ?? "",
      city: property.city ?? "",
      locality: property.locality ?? "",
      property_area: property.property_area ?? "",
      price: property.price ?? "",
      description: property.description ?? "",
      amenities: property.amenities ?? "",
      facing_direction: property.facing_direction ?? "",
      video: property.video ?? "",
      image_ids: property.image_ids ?? "",
      created_at: property.created_at ?? ""
    }));

    return res.json({
      result: "1",
      error: "",
      data: normalizedData
    });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.laststep = async (req, res) => {
  try {
    let { user_id, user_post_id } = req.body;

    user_id = Number(user_id);
    user_post_id = Number(user_post_id);

    if (!user_id || isNaN(user_id) || !user_post_id || isNaN(user_post_id)) {
      return res.status(400).json({
        result: "0",
        error: "user_id and user_post_id are required and must be integers",
        data: []
      });
    }

    const [exist_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
    if (exist_user.length === 0) {
      return res.status(404).json({
        result: "0",
        error: "User does not exist in database",
        data: []
      });
    }

    const [exist_user_post] = await db.query(
      `SELECT * FROM user_posts WHERE U_ID = ? AND user_post_id = ?`,
      [user_id, user_post_id]
    );
    if (exist_user_post.length === 0) {
      return res.status(404).json({
        result: "0",
        error: "User post does not exist in database",
        data: []
      });
    }

    const [updateResult] = await db.query(
      `UPDATE user_posts SET status = 'published', updated_at = NOW() WHERE U_ID = ? AND user_post_id = ?`,
      [user_id, user_post_id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(400).json({
        result: "0",
        error: "Failed to update post status",
        data: []
      });
    }

    return res.json({
      result: "1",
      message: "Post status updated to publish successfully"
    });

  } catch (err) {
    console.error("Server error in laststep:", err);
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};
