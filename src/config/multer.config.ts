import { diskStorage } from 'multer';
import { extname } from 'path';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * Multer 配置 - 用于处理文件上传和 FormData
 */
export const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: './uploads', // 文件保存路径
    filename: (req, file, callback) => {
      // 生成唯一文件名
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
      callback(null, filename);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 文件大小限制
  },
  fileFilter: (req, file, callback) => {
    // 可选：添加文件类型验证
    // 例如只允许图片
    // if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
    //   return callback(new Error('Only image files are allowed!'), false);
    // }
    callback(null, true);
  },
};

/**
 * 内存存储配置 - 用于不需要保存到磁盘的场景
 */
export const multerMemoryConfig: MulterOptions = {
  storage: undefined, // 使用内存存储
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
};
