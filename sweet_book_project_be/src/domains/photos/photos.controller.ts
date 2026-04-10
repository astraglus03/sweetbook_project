import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PhotosService } from './photos.service';

@ApiTags('photos')
@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}
}
