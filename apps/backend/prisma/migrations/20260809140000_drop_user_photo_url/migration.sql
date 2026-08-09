-- 대표 사진(User.photoUrl)을 없애고 사진첩(UserPhoto)을 유일한 출처로 만든다.
-- 응답의 photoUrl은 이제 사진첩의 첫 장에서 파생된다.

-- 1) 기존 대표 사진을 잃지 않도록 사진첩 맨 앞(sortOrder=-1)에 넣는다.
--    이미 사진첩이 있는 유저도 옛 대표 사진이 첫 장으로 유지된다.
INSERT INTO `UserPhoto` (`id`, `userId`, `url`, `sortOrder`, `createdAt`)
SELECT UUID(), `id`, `photoUrl`, -1, NOW(3)
FROM `User`
WHERE `photoUrl` IS NOT NULL;

-- 2) 컬럼 제거.
ALTER TABLE `User` DROP COLUMN `photoUrl`;
