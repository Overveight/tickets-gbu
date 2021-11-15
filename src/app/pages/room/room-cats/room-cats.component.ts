import { Component, OnInit } from '@angular/core';
import {ApiService} from "../../../shared/services/api.service";
import {ActivatedRoute, Router} from "@angular/router";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Cat} from "../../../shared/interfaces/Cat";

@Component({
  selector: 'app-room-cats',
  templateUrl: './room-cats.component.html',
  styleUrls: ['./room-cats.component.scss']
})
export class RoomCatsComponent implements OnInit {
  cats: Cat[] = [];
  constructor(
    private api: ApiService,
    private router: Router,
    private arouter: ActivatedRoute,
    private snackBar: MatSnackBar
  ) { }
  mainCat = [];
  secondCat = [];
  roomId;
  ngOnInit(): void {
    this.arouter.paramMap.subscribe(async (e) => {
      this.roomId = e.get('id');
      this.cats = await this.api.getCatByRoom(this.roomId).toPromise();
      this.cats = [...this.cats, ...this.cats, ...this.cats, ...this.cats, ...this.cats, ...this.cats, ...this.cats, ...this.cats, ...this.cats, ...this.cats, ...this.cats, ...this.cats,...this.cats,...this.cats, ...this.cats,...this.cats,]
    });
  }
  switchCat(id, type): void {
    // 1 - mainCat; 2 - secondCat
    if (type === 1) {
      if (this.mainCat.find((e) => e === id)) {
        this.mainCat = this.mainCat.filter((e) => e !== id);
      } else {
        this.mainCat.push(id);
      }
      // if (!!this.secondCat.find((e) => e === id)) {
      //   this.secondCat = this.secondCat.filter((e) => e !== id);
      // }
    } else {
      if (this.secondCat.find((e) => e === id)) {
        this.secondCat = this.secondCat.filter((e) => e !== id);
      } else {
        this.secondCat.push(id);
      }
      // if (!!this.mainCat.find((e) => e === id)) {
      //   this.mainCat = this.mainCat.filter((e) => e !== id);
      // }
    }
  }
  async startSession(): Promise<void> {
    await this.api.startSession({
      roomId: parseInt(this.roomId, 10),
      mainCategory: this.mainCat.map((e) => ({catId: e})),
      secondCategory: this.secondCat.map((e) => ({catId: e}))
    }).toPromise();
    this.router.navigate(['']);
  }

}
