import { Component, OnInit } from '@angular/core';
import {InvoiceService} from '../../../services/invoice.service';
import {Client, Invoice} from '../../../shared/interfaces';
import {Observable, of, Subscription} from 'rxjs';
import {ClientService} from '../../../services/client.service';
import {Router} from '@angular/router';
import {DataHandlerService} from '../../../services/data-handler.service';
import {mergeMap, switchMap, tap} from 'rxjs/operators';
import {Service, ServicePack} from '../../../data/interfaces';
import {MatDialog} from '@angular/material/dialog';
import {PaidAmountDialogComponent} from '../../../shared/components/paid-amount-dialog/paid-amount-dialog.component';
import data from 'src/app/stats/components/stats/data.json';
import prices from 'src/app/stats/components/stats/prices.json';
import {log} from 'util';

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss']
})
export class StatsComponent implements OnInit {

  invoices$: Observable<Invoice[]>;
  dateStart: Date;
  dateEnd: Date;
  clients: Client[];

  private subscription: Subscription;
  totalServices: Service[];
  timestamps: number[];
  totalServicePacks: ServicePack[];
  certificationTimestamps: number[];

  certificationPrices: number[];

  constructor(
    private clientService: ClientService,
    private dataService: DataHandlerService,
    private invoiceService: InvoiceService,
    private router: Router,
    public dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.dateEnd = new Date();
    this.dateStart = new Date(this.dateEnd.getFullYear(), this.dateEnd.getMonth(), 1);

    this.subscription = this.dataService.getTotalServices().pipe(
      mergeMap((totalServices) => {
        this.totalServices = totalServices;
        return this.dataService.getTimestamps();
      }),
      mergeMap((timestamps) => {
        this.timestamps = timestamps;
        return this.dataService.getTotalServicePacks();
      }),
      mergeMap((totalServicePacks) => {
        this.totalServicePacks = totalServicePacks;
        return this.dataService.getCertificationTimestamps();
      }),
      mergeMap((certificationTimestamps) => {
        this.certificationTimestamps = certificationTimestamps;
        return this.dataService.getCertificationPrices();
      }),
      mergeMap((certificationPrices) => {
        this.certificationPrices = certificationPrices;
        return this.clientService.getAllClients();
      })
    ).subscribe( (clients: Client[]) => {
      this.clients = clients;
      this.invoices$ = this.invoiceService.getAllInvoices(this.dateStart, this.dateEnd).pipe(
        tap((res) => {
        })
      );
    });
  }

  goToInvoice(invoice: Invoice) {
    console.log(invoice);
    // this.router.navigate(['/invoice'], {queryParams: {idx: invoice['idx']}});
  }

  // countTotalAmount(invoice) {
  //   let totalAmount = 0;
  //   const date = new Date(invoice.date);
  //   const {timestampId, certTimestampId} = this.dataService.getTimestampId(date);
  //   if (invoice.serviceIds?.services) {
  //     for (const id of invoice.serviceIds.services) {
  //       totalAmount += this.dataService.totalServices[id].prices[timestampId].mainPrice
  //         ? this.dataService.totalServices[id].prices[timestampId].mainPrice
  //         : this.dataService.totalServices[id].prices[timestampId].price;
  //     }
  //   }
  //
  //   if (invoice.serviceIds?.servicePacks) {
  //     for (const servicePackIds of invoice.serviceIds.servicePacks) {
  //       for (const id of servicePackIds.services) {
  //         totalAmount += this.dataService.totalServices[id].prices[timestampId].mainPrice
  //           ? this.dataService.totalServices[id].prices[timestampId].mainPrice
  //           : this.dataService.totalServices[id].prices[timestampId].price;
  //       }
  //     }
  //   }
  //
  //   if (invoice.certificationArea) {
  //     totalAmount += invoice.certificationArea * this.dataService.certificationPrices[certTimestampId];
  //   }
  //
  //   if (invoice.monitoringServiceIds) {
  //     for (const id of invoice.monitoringServiceIds) {
  //       totalAmount += this.dataService.totalServices[id].prices[timestampId].mainPrice
  //         ? this.dataService.totalServices[id].prices[timestampId].mainPrice
  //         : this.dataService.totalServices[id].prices[timestampId].price;
  //     }
  //   }
  //   if (invoice.additionalSum) {
  //     totalAmount += invoice.additionalSum;
  //   }
  //   return Math.round(totalAmount * 100) / 100;
  // }


  changeDate() {
    this.invoices$ = this.invoiceService.getAllInvoices(this.dateStart, this.dateEnd);
  }

  test() {
    // this.invoiceService.test().subscribe((res) => {
    //   res = res.map(item => {
    //     item.prices.push(item.prices[1]);
    //     return item;
    //   });
    //   console.log(JSON.stringify(res));
    // });

    // const pr = data[1].reduce((dict, el) => {
    //   dict[el.id] = +el.sum;
    //   return dict;
    // }, {});
    //
    // const mainPr = data[2].reduce((dict, el) => {
    //   dict[el.id] = +el.sum;
    //   return dict;
    // }, {});
    //
    // const newPrices = prices.map((el: any): any => {
    //   if (pr[el.prices[2].id]) {
    //     el.prices[2].price = pr[el.prices[2].id];
    //   }
    //   if (mainPr[el.prices[2].id]) {
    //     el.prices[2].mainPrice = mainPr[el.prices[2].id];
    //   }
    //   return el;
    // });
    //
    // this.invoiceService.test(newPrices).subscribe((res) => {
    //   console.log(res);
    // });

    console.log(Date.now());

  }

  setPaidAmount(invoice: Invoice) {
    const dialogRef = this.dialog.open(PaidAmountDialogComponent, {
      width: '250px',
      data: {paidAmount: invoice.paidAmount ? invoice.paidAmount : invoice.amount}
    });

    dialogRef.afterClosed().pipe(
     switchMap((result) => {
       if (result) {
         return this.invoiceService.patch({
           ...invoice,
           date: new Date(invoice.date),
           paidAmount: result['paidAmount']
         });
       } else {
         return of(undefined);
       }
     })
    ).subscribe((i: Invoice) => {
      if (i) {
        this.changeDate();
      }
    });

  }

  isPaid(invoice: Invoice): boolean {
    return invoice.amount <= invoice.paidAmount;
  }

  getServicesList(invoice: Invoice): any {
    const idsMap = {};
    if (invoice.serviceIds.services) {
      invoice.serviceIds.services.forEach(id => {
        idsMap[id] = idsMap[id] ? idsMap[id] + 1 : 1;
      });
    }

    if (invoice.serviceIds.servicePacks) {
      invoice.serviceIds.servicePacks.forEach(servicePack => {
        servicePack.services.forEach(id => {
          idsMap[id] = idsMap[id] ? idsMap[id] + 1 : 1;
        });
      });
    }


    const result = Object.entries(idsMap).reduce((acc, item) => {
      const timestampId = this.dataService.getTimestampId(new Date(invoice.date)).timestampId;
      acc.push({
        title: this.totalServices[item[0]].title,
        id: this.totalServices[item[0]].prices[timestampId].id,
        price: this.totalServices[item[0]].prices[timestampId].mainPrice ? this.totalServices[item[0]].prices[timestampId].mainPrice : this.totalServices[item[0]].prices[timestampId].price,
        count: item[1]
      });
      return acc;
    }, []);
    return result;
  }
}
