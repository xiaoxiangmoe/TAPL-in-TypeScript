Start := _ commands={ term=Command _ ';' _}* $

Command := Eval
Eval := start=@ term=Term end=@

TrueTerm := start=@ 'true' end=@
FalseTerm := start=@ 'false' end=@
ZeroTerm := start=@ '0' end=@

IfTerm := start=@ 'if' __ condition=Term __ 'then' __ then=Term __ 'else' __ else=Term end=@

IsZeroTerm := start=@ '\(' _ 'is_zero'  _ n=Term _ '\)' end=@
SuccTerm := start=@ '\(' _ 'succ' _ n=Term _ '\)' end=@
PredTerm := start=@ '\(' _ 'pred' _ n=Term _ '\)' end=@

Term := TrueTerm | FalseTerm | ZeroTerm | SuccTerm | PredTerm | IfTerm | IsZeroTerm

_ := '\s*'
__ := '\s+'
