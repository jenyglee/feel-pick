import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import Viewer from './entities/viewer.entity';
import { ViewerRepository } from './viewer.repository';

// 사진첩 상한. 무한정 쌓이면 화면도 저장소도 감당이 안 된다.
const MAX_PHOTOS = 9;

@Injectable()
export class ViewerService {
  constructor(private readonly repo: ViewerRepository) {}

  /** 현재 "나" 정보. */
  async getViewer(id: string): Promise<Viewer> {
    const viewer = await this.repo.findById(id);
    if (!viewer) throw new NotFoundException('유저를 찾을 수 없습니다.');
    return viewer;
  }

  /** '가입하기' → 즉시 프리미엄 ON (임시). 갱신된 "나"를 반환. */
  subscribePremium(id: string): Promise<Viewer> {
    return this.repo.setPremium(id, true);
  }

  /** 프로필(사진·자기소개·관심사·상태) 부분 수정. 보낸 필드만 반영된다. */
  updateProfile(id: string, dto: UpdateProfileDto): Promise<Viewer> {
    return this.repo.updateProfile(id, {
      photoUrl: dto.photoUrl,
      bio: dto.bio,
      interests: dto.interests,
      statusMessage: dto.statusMessage,
    });
  }

  /** 사진첩에 사진 추가. 갱신된 "나"를 반환해 화면이 한 번에 다시 그려지게 한다. */
  async addPhoto(id: string, url: string): Promise<Viewer> {
    if ((await this.repo.countPhotos(id)) >= MAX_PHOTOS) {
      throw new BadRequestException(
        `사진은 최대 ${MAX_PHOTOS}장까지 등록할 수 있습니다.`,
      );
    }
    await this.repo.addPhoto(id, url);
    return this.getViewer(id);
  }

  /** 사진첩에서 사진 삭제. 내 사진이 아니면 404. */
  async removePhoto(id: string, photoId: string): Promise<Viewer> {
    const deleted = await this.repo.deletePhoto(id, photoId);
    if (deleted === 0) throw new NotFoundException('사진을 찾을 수 없습니다.');
    return this.getViewer(id);
  }
}
