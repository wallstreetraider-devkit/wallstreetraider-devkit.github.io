// Verbatim multi-paragraph swap-derivatives explainer, lifted from the
// pre-Phase-1 TutorialTooltip.js (commit 540d3ff). The legacy code
// applied a runtime newline -> HTML transform; we do the same here at
// module load so the catalog entry can hold a static string per the
// §B schema. Keep this file isolated from modals.js so the migration
// stays auditable: nothing else should depend on this text.

const SWAP_INFO_TEXT = `
Create interest rate swaps here. Wall Street Raider 
allows you to enter into customized negotiated interest rate
swap derivative contracts, in effect allowing you or your companies
to make huge speculative bets on the future direction of interest
rates, with no up-front payments or investment -- just a lot of
risk, with large potential rewards.

Players or companies with a credit rating of "BBB" or better
and with a net worth of at least $1 billion U.S. (or equivalent)
may enter into interest rate swap agreements with a counterparty,
if a counterparty can be found. The "notional value" of any one
such agreement cannot exceed 10 times the net worth of you or your
company that is seeking to enter into the agreement, or if less, 
$10,000,000 million ($10 trillion) U.S. dollars (or the equivalent
in another currency). The notional value is the amount on which
both the fixed rate of interest and the current rate of interest
are computed at the end of each quarter. The difference in rates,
times the notional value (divided by 4), is paid by one party
to the other each quarter, depending on who is "winning the bet"
at that moment.

You may enter into more than one such swap contract, but not if the
total "notional value" of all your contracts would exceed 10 times
your net worth or $10 trillion, whichever is less. 

The same rules apply to a bank, insurance company, or securities
brokerage that you control. Any other corporation is subject
to all the same requirements but can never have more than one swap
agreement in place at one time.

Each time you enter into a swap agreement, there must be
a "counterparty" taking the other side of the "bet." The
counterparty will generally be a bank, brokerage firm, or
an insurance company. These counterparties, if they have a
"AAA" credit rating, are subject to the same limits on the
size of swaps agreements they can have at any one time. For
such counterparties with credit ratings of AA, A, or BBB,
the multiplier of net worth limit, instead of being 10 times
net worth, is reduced to 8, 5, or 2, respectively, depending
on the credit rating. For any company that is not a bank,
insurance company, or securities brokerage company, the
multiplier is 2 times net worth and such companies may not
become a counterparty if they already have one swap agreement
in place. A counterparty must also have a net worth of at
least $1 billion (U.S.) or the equivalent in any other
currency in order to enter into a swap agreement.

The "long" party to an interest rate swap agrees to receive a
fixed rate of interest from the other party for an agreed
period of time, for up to five years into the future. The
"short" party will, in exchange, receive a variable rate
of interest of the type chosen, which can be the banks' Prime
Rate, or the yield-to-maturity rate on either the long-term
government bond or the short-term government bond. 

The varying rate is determined at the end of each quarter and is
compared to the fixed rate that is to be received by the "long"
party to the swap. If the fixed rate is higher, the net interest
rate differential, as a percentage of the notional principal
amount of the contract, is paid to the "long" party (divided by
4, since there are 4 quarters in a year). If the varying rate is
higher than the fixed rate, the "long" party instead pays the
difference to the "short" party. Interest is calculated on the
agreed "notional" principal amount.

No money changes hands when a swap agreement is entered into.
Instead, one party pays the other party the interest rate
differential at the end of each calendar quarter after the
agreement goes into effect. (When you make an offer, you specify
the quarter and year in which the swap agreement will go into
effect, and when it will end, which can be the same quarter.)

Thus, in effect, if the contract is based on the Prime Rate, the
"long" party is betting that the Prime Rate will fall, while the
"short" party is betting the Prime Rate will rise. Similarly,
if the "bet" is on one of the government bond rates, the
"long" party is betting that interest rate will fall (usually
because the price of the bond is rising) and vice versa in
the case of the "short" party.

Since you will usually be dealing with financial "sharks" (brokers,
insurers, banks), you will seldom be able to enter into a swap
agreement where you actually receive the current Prime Rate as
the"fixed rate," if you are the long party, for example (or the
current Long Bond or Short Bond Rate, if the swap is based on
either of those current rates). For example, if you want to be
"long" on a Prime Rate swap when the Prime is 9%, a bank or
brokerage house may only offer to pay you 8.5% as the fixed
rate, not 9% -- "Take it or leave it."

Or, if you want to be the "short" party when the Prime Rate is
9%, you might have to agree to pay a fixed rate of 9.75% if you
want a counterparty to take your "bet." However, in some rare
cases, a counterparty will accept your offer without making a
counter-offer. (Usually because they know something you don't.)

However, if you control a bank, broker, or insurer that wants
to create a swap, the counteroffer it will be given will still
usually be at a slightly unfavorable fixed rate, but will not
be quite as bad as you or one of your industrial companies will
receive. (Think of it as a "professional courtesy discount" from
one shark to another....)

To create a contract, you must do the following:

  (1) First, select an interest rate on which it will be based
(Prime, Long Bond, or Short Bond Rate);

  (2) Choose whether you want the "long" side of the contract
or the "short" side;

  (3) Enter a notional principal amount (which can't be more
than 10 times your or your company's net worth, or $100,000
million (or the equivalent in the currency in which you are
playing), whichever is less, or you may run afoul of other
limits mentioned above, where you have other existing swap
contracts; and

  (4) Finally, you must select the year and quarter in which the
swap will begin and end, starting no sooner than the next quarter
and ending no later than 5 years after the next quarter. A swap
cannot begin until the next calendar quarter, although it can
begin at a much later date, up to 5 years in the future. Large
swap agreements with a notional value of $10 billion or more
cannot begin later than 4 calendar quarters after the current
quarter.

Once you have entered your desired terms, click on the "OFFER"
button to attempt to find a counterparty. If one is found, it
may accept your terms, but will usually make a counter-offer at
a fixed rate that is lower (if you are the "long" party) or that
is higher than the current rate (if you are the "short" party).
You can either accept a counter-offer, or reject it, if you feel
it is too unfair. (Don't expect any charity, when dealing with
the likes of a Goldman Sachs or a J.P. Morgan. The world of Wall
Street is many things; "fair" is not one of them.)

There are 3 ways a swap contract, once entered into, can terminate:

  (1) By its terms, when it expires;

  (2) Automatically, if either party goes bankrupt, or if a corporate
party becomes insolvent (negative net worth); or

  (3) When you choose an early termination.

At times, when a counterparty is teetering on the edge of bankruptcy
and has little or no cash, it may default on payments it owes you, or
only make partial payments, which is not all bad, since if it made the
full payment and thereby was bankrupted, the contract would be canceled
at that point.

Note that you can choose to terminate a swap contract, but to do
so you must pay the counterparty a termination fee, an amount equal
to at least a half-year's interest rate differential at the rates
then in effect, if the differential is currently unfavorable. (If the
current rate differential is favorable to you, you probably would not
want to terminate the contract!) However, in any case the termination
fee will rarely be less than 0.5% of the notional principal amount the
contract is based upon (or from 1% to as much as 3% if the contract has
more than one year left to run). The longer the remaining term of the
contract, the higher the termination fee, and the longer the commencement
of the the swap is deferred, the higher the termination fee.

As in the real world, these swap agreements are derivative instruments
that do not show up as assets or as liabilities on companies' balance
sheets. As such, they are "weapons of mass financial destruction,"
as Warren Buffett has termed them, which can destroy banks or other
entities that have a large exposure from such derivatives. 

Since you will be betting against the "house," on their terms,
when you enter into a swap agreement, much like playing at a
casino, you should expect to lose much of the time, though you
may occasionally win a jackpot. Think of doing swaps as a last,
desperate resort -- sort of like trying to get out of debt by
going to Las Vegas and trying your luck at the tables.... knowing
that the "house" sets the rules and usually wins.

In the real investment world, the terms of the swap agreements that
a company has entered into are kept secret from investors, generally.
(In W$R, if you control a company, you can view all of its swaps
contracts and their terms by using the swaps submenu "View List of Swap
Contracts" button.) Only a small footnote will appear in a company's
Financial Profile, which only discloses the total "notional amount"
of all such swaps contracts a company has entered into, if any, so
you will have no clue, when reading the company's financial information,
as to whether it is "long" or "short" in such contracts, or whether the
swaps are likely to be profitable or disastrous for the company in
coming periods.

In older versions of the simulation, you also did not know if the
counterparties to any of the company's swaps were likely to go broke
and default on the contracts, even when the company had bet right on
the direction of interest rates, since you could not find out the
identity of the counterparties. (Pretty much like the real world of
Wall Street, eh?)

However, those limits on disclosure all were removed in Version 7.0
of W$R, which added a "Who Owns What?" button to the General Research
Menu, allowing you peek "under the hood" and see a summary of the
terms of all interest rate swap agreements that are currently in
effect, including those where a player is a party to a swap agreement.

Occasionally, you may see a news item or a brief sentence in a Research
Report on a company, stating that it is generating large profits or losses
on interest rate swaps. Otherwise, information on these derivatives
contracts is something you may often overlook, and you can get a rude
surprise when an otherwise profitable company in whose stock you have
invested suddenly reports that it is incurring huge losses on interest
rate swaps, which may go on for years in some cases.

Being aware of that kind of information can be very profitable in
itself. For example, if a company you control has a highly profitable
swap agreement in place, you may want to consider selling short
the stock of the counterparty, which you will know is likely to be
incurring some very large losses under the swap agreement, for as
long as it remains in effect and the terms remain unfavorable to it.`;

export const SWAP_INFO_HTML = `<div style="max-height: 400px; overflow-y: auto; font-size: var(--font-size-sm); line-height: 1.4;">${SWAP_INFO_TEXT.replaceAll('\n\n', '<<PARA>>').replaceAll('\n', ' ').replaceAll('<<PARA>>', '<br><br>')}</div>`;
