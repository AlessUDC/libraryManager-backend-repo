import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { BooksService } from '../services/books.service';
import { CreateBookDto, UpdateBookDto } from '../dto/book.dto';
import { CreateCopyDto, UpdateCopyDto } from '../dto/copy.dto';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get('autocomplete')
  autocomplete(
    @Query('text') text: string,
    @Query('type') type: 'title' | 'author' | 'category'
  ) {
    return this.booksService.autocomplete(text, type);
  }

  @Post()
  createBook(@Body() createBookDto: CreateBookDto) {
    return this.booksService.createBook(createBookDto);
  }

  @Get()
  findAllBooks() {
    return this.booksService.findAllBooks();
  }

  @Get(':id')
  findOneBook(@Param('id') id: string) {
    return this.booksService.findOneBook(id);
  }

  @Patch(':id')
  updateBook(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    return this.booksService.updateBook(id, updateBookDto);
  }

  @Delete(':id')
  removeBook(@Param('id') id: string) {
    return this.booksService.removeBook(id);
  }

  // Copies
  @Post('copies')
  createCopy(@Body() createCopyDto: CreateCopyDto) {
    return this.booksService.createCopy(createCopyDto);
  }

  @Get(':id/copies')
  findCopiesByBook(@Param('id') id: string) {
    return this.booksService.findCopiesByBook(id);
  }

  @Patch('copies/:copyId')
  updateCopy(@Param('copyId') copyId: string, @Body() updateCopyDto: UpdateCopyDto) {
    return this.booksService.updateCopy(copyId, updateCopyDto);
  }

  @Delete('copies/:copyId')
  removeCopy(@Param('copyId') copyId: string) {
    return this.booksService.removeCopy(copyId);
  }
}
