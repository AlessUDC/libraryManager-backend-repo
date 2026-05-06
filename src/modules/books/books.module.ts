import { Module } from '@nestjs/common';
import { BooksController } from './controllers/books.controller';
import { CategoriesController } from './controllers/categories.controller';
import { AuthorsController } from './controllers/authors.controller';
import { BooksService } from './services/books.service';
import { CategoriesService } from './services/categories.service';
import { AuthorsService } from './services/authors.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    BooksController,
    CategoriesController,
    AuthorsController
  ],
  providers: [
    BooksService,
    CategoriesService,
    AuthorsService
  ],
  exports: [
    BooksService,
    CategoriesService,
    AuthorsService
  ]
})
export class BooksModule {}
