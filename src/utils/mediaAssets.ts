import femaleDentistImg from '../assets/images/doctor_female_avatar_1794604646720.jpg';
import maleDentistImg from '../assets/images/doctor_male_avatar_1794604646849.jpg';
import orthoDentistImg from '../assets/images/doctor_ortho_avatar_1794604647781.jpg';
import xrayOpgImg from '../assets/images/xray_opg_sample_1794604647326.jpg';
import xrayPaImg from '../assets/images/xray_periapical_sample_1794604647657.jpg';
import type { AvatarKey, RadiologyAssetKey } from '../types/clinic';

export const DOCTOR_AVATARS: Record<AvatarKey, string> = {
  female_dentist: femaleDentistImg,
  male_dentist: maleDentistImg,
  ortho_dentist: orthoDentistImg,
};

export const RADIOLOGY_ASSETS: Record<RadiologyAssetKey, string> = {
  xray_opg: xrayOpgImg,
  xray_pa: xrayPaImg,
};
