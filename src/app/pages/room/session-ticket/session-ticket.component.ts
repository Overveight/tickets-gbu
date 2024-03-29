import {Component, Inject, OnInit} from '@angular/core';
import {Queue, Windows} from "../../../shared/services/queue";
import {ActivatedRoute, Router} from "@angular/router";
import {MatSnackBar} from "@angular/material/snack-bar";
import {ApiService} from "../../../shared/services/api.service";
import {MAT_DIALOG_DATA, MatDialog} from "@angular/material/dialog";
import {Tickets} from "../../../shared/interfaces/myTickets";
import {Reason} from "../../../shared/interfaces/reason";
import {AppComponent} from "../../../app.component";
import {map} from "rxjs/operators";
import {forkJoin} from "rxjs";
import {SignalRService} from "../../../shared/services/signal-r.service";

@Component({
  selector: 'app-session-ticket',
  templateUrl: './session-ticket.component.html',
  styleUrls: ['./session-ticket.component.scss']
})
export class SessionTicketComponent implements OnInit {

  queue: Queue[] = [];
  myTicket: Tickets;
  timer = 0;
  ticketTimer = 0;
  activeTicket: number = null;
  interval;
  sessionId;
  ticketId;
  constructor(
    public app: AppComponent,
    private router: Router,
    private snackBar: MatSnackBar,
    public api: ApiService,
    private dialog: MatDialog,
    private signal: SignalRService,
    private arouter: ActivatedRoute
  ) {
  }
  get timeSeconds(): any {
    let date = new Date(null);
    date.setSeconds(this.timer);
    let result = date.toISOString().substr(11, 8);
    return result;
  }
  get ticketSessionTime(): any {
    if(!this.myTicket) {
      return '';
    }
    let date = new Date(null);
    date.setSeconds(this.ticketTimer);
    let result = date.toISOString().substr(11, 8);
    return result;
  }
  async parseData(): Promise<void> {
    await this.app.getSessions();
    this.queue = await this.api.getQueue().pipe(
      map(i => i.filter(i2 => i2.roomId === this.app.sessions[0].roomId))
    ).toPromise();
    let t = await this.api.getMyTickets().toPromise();
    this.myTicket = t.find((e) => e.id === parseInt(this.ticketId));
    if(this.app.sessions[0].id !== parseInt(this.sessionId) || !this.myTicket) {
      this.router.navigate(['/']);
    }
    if(this.queue.length > 0) {
      this.activeTicket = 0;
    }
    const timers = this.app.sessions[0].pauses.filter(e => e.dateOver !== null).map((e) => {
      const date1 = new Date(e.dateStart);
      const date2 = new Date(e.dateOver);
      const diffTime = Math.abs(date2.getTime() - date1.getTime());
      const diffDays = Math.ceil(diffTime / (1000));
      return diffDays;
    });
    this.timer = new Date().getTime() - new Date(this.app.sessions[0].dateStart).getTime();
    this.timer = Math.floor(this.timer/1000) - (timers.length > 0 ? timers.reduce((a, b) => a + b) : 0);
    this.ticketTimer = new Date().getTime() - new Date(this.myTicket.dateStart).getTime();
    this.ticketTimer = Math.floor(this.ticketTimer/1000);
    try {
      clearInterval(this.interval);
    } catch (e) {

    }
    this.interval = setInterval(() => {
      if(this.app.sessions[0].pause.length === 0) {
        ++this.timer;
      }
      ++this.ticketTimer;
    }, 1000)
  }
  changeActiveTicket(index): void {
    this.activeTicket = index;
  }
  ngOnDestroy() {
    clearInterval(this.interval);
  }

  async ngOnInit(): Promise<void> {
    this.arouter.paramMap.subscribe((e) => {
        this.sessionId = e.get('id');
        this.ticketId = e.get('tId');
      }
    )
    await this.signal.startConnection();
    if(this.app.sessions.length === 0) {
      await this.app.getSessions();
    }
    this.parseData();
  }
  async stopSession(): Promise<void> {
    await this.api.stopSession().toPromise();
    this.router.navigate(['/room/list']);
    this.snackBar.open('Сессия завершена!', null, {
      duration: 1000,
      panelClass: ['snack-bar-card']
    })
  }
  async sendNotify(): Promise<void> {
    await this.signal.startConnection();
    this.signal.invokeMethod('ReCall', parseInt(this.ticketId, 10));
  }
  async switchPause(): Promise<void> {
    if(this.app.sessions[0].pause === null || this.app.sessions[0].pause.length === 0) {
      await this.api.pauseSession().toPromise();
      this.parseData();
    } else {
      await this.api.unpauseSession().toPromise();
      this.parseData();
    }
  }
  async nextTicket(): Promise<void> {
  }
  async overTicket(): Promise<void> {
    await this.api.nextTicket().toPromise();
  }
  async sendDialog(type = 1): Promise<void> {
    const dialogRef = this.dialog.open(TicketEndComponent, {
      data: {
        type: type,
        roomId: this.app.sessions[0].roomId
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if(!result) {
        return;
      }
      switch (type) {
        case 1: {
          await this.api.overTicket({...result, overId: result.id, ticketId: parseInt(this.ticketId)}).toPromise();
          var next = await this.api.nextTicket().toPromise();
          this.router.navigate([`room/session/${this.sessionId}/ticket/${next.id}`])
          break;
        }
        case 2: {
          await this.api.redirectTicket({...result, redirectId: result.id, ticketId: parseInt(this.ticketId)}).toPromise();
          this.router.navigate(['room/session/' + this.sessionId])
          break;
        }
        case 3: {
          await this.api.postponeTicket({...result, postponeId: result.id, ticketId: parseInt(this.ticketId)}).toPromise();
          this.router.navigate(['room/session/' + this.sessionId])
          break;
        }
      }
    });
  }
}
@Component({
  selector: 'dialog-end-ticket',
  templateUrl: 'formEndTicketDialog.component.html',
  styleUrls: ['./session-ticket.component.scss']
})
export class TicketEndComponent {
  constructor(
    private api: ApiService,
    @Inject(MAT_DIALOG_DATA) public type: any // type 1 - завершить, type 2 - перенаправить, type 3 - отложить
  ) {
    this.data = this.type.type;
    console.log(this.data);
    switch (this.data) {
      case 1: {
          this.api.getReasons().subscribe((e) => {
          this.reasons = e;
        });
        break;
      }
      case 2: {
        forkJoin([
          this.api.getReasonRedirects(),
          this.api.getWindows(this.type.roomId)
        ]).subscribe((e) => {
          this.reasons = e[0];
          this.windows = e[1];
        });
        break;
      }
      case 3: {
        this.api.getPostpones().subscribe((e) => {
          this.reasons = e;
        });
        break;
      }
    }
  }
  reasons: Reason[] = [];
  windows: Windows[] = [];
  selected;
  selectedWindow;
  inits = '';
  comment = '';
  data;
}
