import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import Viewer from './entities/viewer.entity';
import { ViewerRepository } from './viewer.repository';

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

  /** 프로필(사진·자기소개·관심사) 부분 수정. 보낸 필드만 반영된다. */
  updateProfile(id: string, dto: UpdateProfileDto): Promise<Viewer> {
    return this.repo.updateProfile(id, {
      photoUrl: dto.photoUrl,
      bio: dto.bio,
      interests: dto.interests,
    });
  }
}
