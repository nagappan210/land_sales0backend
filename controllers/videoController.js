const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const db = require('../db');
ffmpeg.setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe');

exports.createPostStep6 = async (req, res) => {
  try {
    let { user_id, user_post_id, post_type } = req.body;
    const files = req.files;

    user_id = Number(user_id);
    user_post_id = Number(user_post_id);
    post_type = String(post_type);

    const draft = 6;

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
        error: "User not found in database",
        data: []
      });
    }

    if (!files || (!files.video && !files.images)) {
      return res.status(400).json({
        result: "0",
        error: "No media files uploaded.",
        data: []
      });
    }

    if (post_type === "1" && files.video?.length > 0) {
      const videoPath = files.video[0].path;

      const [video] = await db.query(
        `UPDATE user_posts 
         SET video = ?, post_type = ?, image_ids = NULL, updated_at = NOW(), draft = ? 
         WHERE U_ID = ? AND user_post_id = ?`,
        [videoPath, post_type, draft, user_id, user_post_id]
      );

      if (video.affectedRows === 0) {
        return res.status(404).json({
          result: "0",
          error: "Post not found for given user_id or user_post_id",
          data: []
        });
      }

      return res.json({
        result: "1",
        message: "Video uploaded successfully",
        post_type,
        video: `${process.env.SERVER_ADDRESS}/${videoPath.replace(/\\/g, "/")}`
      });
    }

    if (post_type === "2" && files.images?.length > 0) {
      const imageFiles = files.images;
      const tempDir = `uploaded/posts/${Date.now()}_sequence`;
      await fs.mkdir(tempDir, { recursive: true });

      const insertedImageIds = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const destPath = path.join(tempDir, `img_${String(i).padStart(3, "0")}.jpg`);
        await sharp(imageFiles[i].path)
          .resize({ width: 1280, height: 720, fit: "contain", background: "#000" })
          .jpeg()
          .toFile(destPath);

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

      await fs.rm(tempDir, { recursive: true, force: true });

      const imageIdsStr = insertedImageIds.join(",");

      const [imageUpdate] = await db.query(
        `UPDATE user_posts 
         SET video = ?, image_ids = ?, post_type = ?, updated_at = NOW(), draft = ? 
         WHERE U_ID = ? AND user_post_id = ?`,
        [outputVideoPath, imageIdsStr, post_type, draft, user_id, user_post_id]
      );

      if (imageUpdate.affectedRows === 0) {
        return res.status(404).json({
          result: "0",
          error: "Post not found for given user_id/user_post_id",
          data: []
        });
      }

      return res.json({
        result: "1",
        message: "Images converted to video successfully",
        post_type,
        video: `${process.env.SERVER_ADDRESS}/${outputVideoPath.replace(/\\/g, "/")}`,
        image_ids: insertedImageIds
      });
    }
    return res.status(400).json({
      result: "0",
      error: "Invalid post_type or missing files.",
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
