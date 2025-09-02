const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const db = require('../db');
const { buffer } = require('stream/consumers');
ffmpeg.setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe');
const axios = require("axios");


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

    // IMAGE POST
    if (post_type === "2" && Array.isArray(image_urls) && image_urls.length > 0) {
      const tempDir = `uploaded/posts/${Date.now()}_sequence`;
      await fs.mkdir(tempDir, { recursive: true });

      const insertedImageIds = [];
      let firstImagePath = null;

      for (let i = 0; i < image_urls.length; i++) {
        const url = image_urls[i];
        const destPath = path.join(tempDir, `img_${String(i).padStart(3, "0")}.jpg`);

        // Download remote image
        let response;
        try {
          response = await axios.get(url, { responseType: "arraybuffer" });
        } catch {
          return res.status(400).json({ result: "0", error: `Failed to download image: ${url}`, data: [] });
        }

        // Convert buffer to JPEG
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

      const outputVideoPath = `uploaded/posts/post_${Date.now()}.mp4`;

      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(path.join(tempDir, "img_%03d.jpg"))
          .inputOptions(["-framerate 0.4"])
          .outputOptions(["-c:v libx264", "-r 30", "-pix_fmt yuv420p"])
          .on("end", resolve)
          .on("error", reject)
          .save(outputVideoPath);
      });

      const imageIdsStr = insertedImageIds.join(",");

      const [imageUpdate] = await db.query(
        `UPDATE user_posts 
         SET video = ?, image_ids = ?, post_type = ?, thumbnail = ?, updated_at = NOW(), draft = ? 
         WHERE U_ID = ? AND user_post_id = ?`,
        [outputVideoPath, imageIdsStr, post_type, firstImagePath, draft, user_id, user_post_id]
      );

      if (imageUpdate.affectedRows === 0) {
        return res.status(404).json({ result: "0", error: "Post not found", data: [] });
      }

      return res.json({
        result: "1",
        message: "Image URLs converted to video + thumbnail",
        post_type,
        video: `${process.env.SERVER_ADDRESS}/${outputVideoPath.replace(/\\/g, "/")}`,
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
